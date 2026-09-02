const {authUser,rest}=require('../../lib/supabase-server');
const {ENGINE_VERSION,ageFromDob}=require('../../lib/matching-engine');
const {buildMatchPrior}=require('../../lib/wonder-mind-match');
const {runMind}=require('../../lib/wonder-mind-runtime');
const {health:modelHealth}=require('../../lib/wonder-model-gateway');

const MATCH_ENGINE_VERSION=`${ENGINE_VERSION}+mind-prior-v1`;

async function latestModel(userId){const rows=await rest(`/person_model_snapshots?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=1`,{admin:true});const row=rows[0];if(!row)return null;return{dimensions:row.scores||{},evidence:row.confidence?.evidence||{},coverage:Number(row.confidence?.coverage||0),archetypes:row.archetypes||[],model_version:row.model_version};}
async function birthMap(){try{const rows=await rest('/birth_data?select=user_id,date_of_birth',{admin:true});return Object.fromEntries(rows.map(r=>[r.user_id,r.date_of_birth]));}catch{return{};}}
function enrich(profile,births){const dob=births[profile.user_id]||null;return{...profile,date_of_birth:dob,_age:ageFromDob(dob),location_data:profile.location_data||null};}
async function declinedCandidates(userId){try{const feedback=await rest(`/match_feedback?user_id=eq.${userId}&reaction=eq.decline&select=match_id`,{admin:true});const ids=feedback.map(x=>x.match_id).filter(Boolean);if(!ids.length)return new Set();const encoded=ids.map(id=>`"${id}"`).join(',');const rows=await rest(`/matches?id=in.(${encoded})&select=matched_user_id`,{admin:true});return new Set(rows.map(r=>r.matched_user_id));}catch{return new Set();}}
async function react(userId,body){
 const matchId=body.match_id,reaction=String(body.reaction||'');if(!matchId||!['explore','decline'].includes(reaction))throw new Error('Invalid reaction');
 const rows=await rest(`/matches?id=eq.${encodeURIComponent(matchId)}&user_id=eq.${userId}&select=id,matched_user_id`,{admin:true});if(!rows[0])throw new Error('Match not found');
 await rest('/match_feedback',{method:'POST',admin:true,prefer:'return=minimal',body:{match_id:matchId,user_id:userId,reaction,notes:String(body.notes||'').trim()||null}});
 await rest(`/matches?id=eq.${encodeURIComponent(matchId)}&user_id=eq.${userId}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:reaction==='explore'?'exploring':'declined'}});
 return{ok:true,reaction,candidate_user_id:rows[0].matched_user_id};
}

function sortablePrior(prior){
 const vals=Object.values(prior.dimensions||{}).filter(Number.isFinite);
 const mean=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:.5;
 return Math.round(mean*prior.prior_confidence*10000)/100;
}

async function mindReview(userId,candidateUserId,prior){
 try{
  const review=await runMind({
    userId,runType:'match',history:[],
    message:'Evaluate this possible introduction conservatively. Treat the static model as a prior, not a verdict. Identify what is promising, what is uncertain, and what can only be learned through interaction. Do not claim chemistry, attraction, or relationship success before evidence exists.',
    payload:{candidateUserId,matchPrior:prior}
  });
  return {available:true,run_id:review.runId,confidence:review.confidence,epistemic_class:review.epistemicClass,explanation:review.reply};
 }catch(e){console.error('Wonder Mind match review',{code:e.code,message:e.message});return{available:false,code:e.code||'MIND_REVIEW_FAILED'};}
}

module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 const auth=String(req.headers.authorization||''),token=auth.startsWith('Bearer ')?auth.slice(7):'',user=await authUser(token);if(!user?.id)return res.status(401).json({error:'Authentication required.'});
 try{
  if(req.body?.action==='reaction')return res.status(200).json(await react(user.id,req.body));
  const births=await birthMap(),declined=await declinedCandidates(user.id);
  const meRaw=(await rest(`/profiles?user_id=eq.${user.id}&select=*`,{admin:true}))[0]||{},meProfile=enrich(meRaw,births),meModel=await latestModel(user.id);
  if(!meModel)return res.status(409).json({error:'Complete the Wonder assessment before generating introductions.'});
  const candidates=(await rest(`/profiles?user_id=neq.${user.id}&select=*`,{admin:true})).filter(p=>!declined.has(p.user_id)).map(p=>enrich(p,births)),eligible=[],rejected=[];
  for(const profile of candidates){
   const model=await latestModel(profile.user_id);if(!model)continue;
   const prior=buildMatchPrior({profile:meProfile,model:meModel},{profile,model});
   const score=prior.eligible?sortablePrior(prior):0;
   await rest('/compatibility_scores?on_conflict=user_id,candidate_user_id,engine_version',{method:'POST',admin:true,prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:user.id,candidate_user_id:profile.user_id,engine_version:MATCH_ENGINE_VERSION,eligible:prior.eligible,score,confidence:prior.prior_confidence,components:{dimensions:prior.dimensions||{},deterministic_components:prior.deterministic_components||{},hard_details:prior.hard_details||{},uncertainty:prior.uncertainty},hard_conflicts:prior.hard_conflicts||[],rationale:{...(prior.rationale||{}),epistemic_note:prior.epistemic_note||null,decision:prior.decision}}});
   if(prior.eligible)eligible.push({candidate_user_id:profile.user_id,profile,prior,score});else rejected.push({candidate_user_id:profile.user_id,reasons:prior.hard_conflicts,details:prior.hard_details});
  }
  eligible.sort((a,b)=>b.score-a.score||b.prior.prior_confidence-a.prior.prior_confidence);
  const model=await modelHealth();
  const top=[];
  for(const item of eligible.slice(0,3)){
   const {candidate_user_id,profile,prior,score}=item;
   const mind=model.ok&&model.modelAvailable!==false?await mindReview(user.id,candidate_user_id,prior):{available:false,code:model.code||'SELF_HOSTED_MODEL_OFFLINE'};
   let matchId=null;
   try{
    const rows=await rest('/matches?on_conflict=user_id,matched_user_id',{method:'POST',admin:true,prefer:'resolution=merge-duplicates,return=representation',body:{user_id:user.id,matched_user_id:candidate_user_id,score,rationale:{engine_version:MATCH_ENGINE_VERSION,prior_confidence:prior.prior_confidence,uncertainty:prior.uncertainty,dimensions:prior.dimensions,strengths:prior.rationale?.strengths||[],tensions:prior.rationale?.tensions||[],distance_miles:prior.hard_details?.distance_miles??null,mind_run_id:mind.run_id||null,mind_epistemic_class:mind.epistemic_class||null},status:'suggested'}});matchId=rows?.[0]?.id||null;
   }catch(e){console.error('persist suggested match',e);}
   top.push({match_id:matchId,candidate_user_id,first_name:profile.first_name||null,current_city:profile.current_city||null,prior_score:score,prior_confidence:prior.prior_confidence,uncertainty:prior.uncertainty,dimensions:prior.dimensions,rationale:prior.rationale,distance_miles:prior.hard_details?.distance_miles??null,wonder_mind:mind});
  }
  return res.status(200).json({engine_version:MATCH_ENGINE_VERSION,epistemic_posture:'Static compatibility is a prior. Dyadic interaction is the primary learning surface.',self_hosted_mind_available:Boolean(model.ok&&model.modelAvailable!==false),matches:top,evaluated:eligible.length+rejected.length,eligible_count:eligible.length,rejected_count:rejected.length});
 }catch(e){console.error('match generation',e);const status=/Invalid reaction|not found/i.test(String(e.message))?400:500;return res.status(status).json({error:status===400?String(e.message):'Unable to generate introductions.'});}
};