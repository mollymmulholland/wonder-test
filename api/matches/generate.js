const {authUser,rest}=require('../../lib/supabase-server');
const {compatibility,ENGINE_VERSION,ageFromDob}=require('../../lib/matching-engine');

async function latestModel(userId){
  const rows=await rest(`/person_model_snapshots?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=1`,{admin:true});
  const row=rows[0];if(!row)return null;
  return{dimensions:row.scores||{},evidence:row.confidence?.evidence||{},coverage:Number(row.confidence?.coverage||0),archetypes:row.archetypes||[],model_version:row.model_version};
}
async function birthMap(){try{const rows=await rest('/birth_data?select=user_id,date_of_birth',{admin:true});return Object.fromEntries(rows.map(r=>[r.user_id,r.date_of_birth]));}catch{return{};}}
function enrich(profile,births){const dob=births[profile.user_id]||null;return{...profile,date_of_birth:dob,_age:ageFromDob(dob),location_data:profile.location_data||null};}

module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 const auth=String(req.headers.authorization||''),token=auth.startsWith('Bearer ')?auth.slice(7):'',user=await authUser(token);if(!user?.id)return res.status(401).json({error:'Authentication required.'});
 try{
  const births=await birthMap();
  const meRaw=(await rest(`/profiles?user_id=eq.${user.id}&select=*`,{admin:true}))[0]||{},meProfile=enrich(meRaw,births),meModel=await latestModel(user.id);
  if(!meModel)return res.status(409).json({error:'Complete the Wonder assessment before generating introductions.'});
  const candidates=(await rest(`/profiles?user_id=neq.${user.id}&select=*`,{admin:true})).map(p=>enrich(p,births)),eligible=[],rejected=[];

  for(const profile of candidates){
   const model=await latestModel(profile.user_id);if(!model)continue;
   const result=compatibility({profile:meProfile,model:meModel},{profile,model});
   await rest('/compatibility_scores?on_conflict=user_id,candidate_user_id,engine_version',{method:'POST',admin:true,prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:user.id,candidate_user_id:profile.user_id,engine_version:ENGINE_VERSION,eligible:result.eligible,score:result.score,confidence:result.confidence,components:{...(result.components||{}),hard_details:result.hard_details||{}},hard_conflicts:result.hard_conflicts||[],rationale:result.rationale||{}}});
   if(result.eligible)eligible.push({candidate_user_id:profile.user_id,profile,result});else rejected.push({candidate_user_id:profile.user_id,reasons:result.hard_conflicts,details:result.hard_details});
  }

  eligible.sort((a,b)=>b.result.score-a.result.score||b.result.confidence-a.result.confidence);
  const ranked=eligible.slice(0,3),top=[];
  for(const {candidate_user_id,profile,result} of ranked){
    let matchId=null;
    try{
      const rows=await rest('/matches?on_conflict=user_id,matched_user_id',{method:'POST',admin:true,prefer:'resolution=merge-duplicates,return=representation',body:{user_id:user.id,matched_user_id:candidate_user_id,score:result.score,rationale:{engine_version:ENGINE_VERSION,confidence:result.confidence,components:result.components,strengths:result.rationale?.strengths||[],tensions:result.rationale?.tensions||[],distance_miles:result.hard_details?.distance_miles??null},status:'suggested'}});
      matchId=rows?.[0]?.id||null;
    }catch(e){console.error('persist suggested match',e);}
    top.push({match_id:matchId,candidate_user_id,first_name:profile.first_name||null,current_city:profile.current_city||null,score:result.score,confidence:result.confidence,components:result.components,rationale:result.rationale,distance_miles:result.hard_details?.distance_miles??null});
  }
  return res.status(200).json({engine_version:ENGINE_VERSION,matches:top,evaluated:eligible.length+rejected.length,eligible_count:eligible.length,rejected_count:rejected.length});
 }catch(e){console.error('match generation',e);return res.status(500).json({error:'Unable to generate introductions.'});}
};