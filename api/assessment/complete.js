const {authUser,rest}=require('../../lib/supabase-server');
const {scoreResponses,inferArchetypes}=require('../../lib/person-model');
const {buildMirror}=require('../../lib/mirror-engine');

function median(values=[]){const v=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:Math.round((v[m-1]+v[m])/2);}
function qualityEvidence(rows=[]){const times=rows.map(r=>Number(r.response_time_ms)).filter(n=>Number.isFinite(n)&&n>0),changes=rows.map(r=>Math.max(0,Number(r.changed_count||0)));return{response_count:rows.length,median_response_time_ms:median(times),rapid_response_count:times.filter(n=>n<1200).length,changed_response_count:changes.filter(n=>n>0).length,total_changed_count:changes.reduce((a,b)=>a+b,0)};}

module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 const auth=String(req.headers.authorization||''),token=auth.startsWith('Bearer ')?auth.slice(7):'',user=await authUser(token);if(!user?.id)return res.status(401).json({error:'Authentication required.'});
 const {session_id}=req.body||{};if(!session_id)return res.status(400).json({error:'session_id is required.'});
 try{
  const sessions=await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`,{accessToken:token});const session=sessions?.[0];if(!session)return res.status(404).json({error:'Assessment session not found.'});
  const existing=await rest(`/person_model_snapshots?assessment_session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc&limit=1`,{accessToken:token});
  if(existing?.[0]){const snap=existing[0],model={dimensions:snap.scores||{},evidence:snap.confidence?.evidence||{},coverage:Number(snap.confidence?.coverage||0)},archetypes=Array.isArray(snap.archetypes)?snap.archetypes:[],quality=snap.evidence?.quality||snap.evidence||{},mirror=buildMirror(model,archetypes,{response_count:Number(snap.evidence?.response_count||quality.response_count||0),quality});return res.status(200).json({model,archetypes,mirror,response_count:Number(snap.evidence?.response_count||quality.response_count||0),quality,snapshot_id:snap.id,already_completed:true});}
  const rows=await rest(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=item_id,response,response_time_ms,changed_count`,{accessToken:token});
  // Five Elements core currently contributes 35 required answers. Do not create a Mirror
  // before the user has actually traversed the full elemental sequence.
  if(rows.length<35)return res.status(409).json({error:'Complete the Five Elements before entering the Mirror.',response_count:rows.length,required:35});
  const responses={};for(const row of rows)responses[row.item_id]=row.response;const model=scoreResponses(responses),archetypes=inferArchetypes(model),quality=qualityEvidence(rows),mirror=buildMirror(model,archetypes,{response_count:rows.length,quality});
  const evidence={response_count:rows.length,quality,elements:mirror.elements,patterns:mirror.patterns,mirror_basis:mirror.basis};
  const created=await rest('/person_model_snapshots?select=*',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:user.id,assessment_session_id:session_id,model_version:'wonder-person-model-v2.3-elements',scores:model.dimensions,confidence:{coverage:model.coverage,evidence:model.evidence,archetype_confidence:mirror.archetype_confidence},evidence,archetypes}});
  await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}`,{method:'PATCH',accessToken:token,prefer:'return=minimal',body:{status:'completed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
  return res.status(200).json({model,archetypes,mirror,response_count:rows.length,quality,snapshot_id:created?.[0]?.id||null,already_completed:false});
 }catch(e){console.error('assessment complete',e);return res.status(500).json({error:'Unable to complete assessment.'});}
};