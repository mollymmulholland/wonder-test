const {authUser,rest}=require('../../lib/supabase-server');
const {scoreResponses,inferArchetypes}=require('../../lib/person-model');
const {buildMirror}=require('../../lib/mirror-engine');

function median(values=[]){const v=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:Math.round((v[m-1]+v[m])/2);}
function qualityEvidence(rows=[]){
  const times=rows.map(r=>Number(r.response_time_ms)).filter(n=>Number.isFinite(n)&&n>0),changes=rows.map(r=>Math.max(0,Number(r.changed_count||0)));
  return{
    response_count:rows.length,
    median_response_time_ms:median(times),
    rapid_response_count:times.filter(n=>n<1200).length,
    changed_response_count:changes.filter(n=>n>0).length,
    total_changed_count:changes.reduce((a,b)=>a+b,0)
  };
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});

  const {session_id}=req.body||{};
  if(!session_id)return res.status(400).json({error:'session_id is required.'});

  try{
    const sessions=await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`,{accessToken:token});
    const session=sessions?.[0];if(!session)return res.status(404).json({error:'Assessment session not found.'});

    const existing=await rest(`/person_model_snapshots?assessment_session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc&limit=1`,{accessToken:token});
    if(existing?.[0]){
      const snap=existing[0],model={dimensions:snap.scores||{},evidence:snap.confidence?.evidence||{},coverage:Number(snap.confidence?.coverage||0)},archetypes=Array.isArray(snap.archetypes)?snap.archetypes:[],mirror=buildMirror(model,archetypes);
      return res.status(200).json({model,archetypes,mirror,response_count:Number(snap.evidence?.response_count||0),quality:snap.evidence||{},snapshot_id:snap.id,already_completed:true});
    }

    const rows=await rest(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=item_id,response,response_time_ms,changed_count`,{accessToken:token});
    if(rows.length<24)return res.status(409).json({error:'Wonder needs a little more evidence before completing this Mirror.',response_count:rows.length});

    const responses={};for(const row of rows)responses[row.item_id]=row.response;
    const model=scoreResponses(responses),archetypes=inferArchetypes(model),mirror=buildMirror(model,archetypes),quality=qualityEvidence(rows);

    const created=await rest('/person_model_snapshots?select=*',{
      method:'POST',admin:true,prefer:'return=representation',body:{
        user_id:user.id,assessment_session_id:session_id,model_version:'wonder-person-model-v2.1',scores:model.dimensions,
        confidence:{coverage:model.coverage,evidence:model.evidence},evidence:quality,archetypes
      }
    });

    await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}`,{
      method:'PATCH',accessToken:token,prefer:'return=minimal',body:{status:'completed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    });

    return res.status(200).json({model,archetypes,mirror,response_count:rows.length,quality,snapshot_id:created?.[0]?.id||null,already_completed:false});
  }catch(e){console.error('assessment complete',e);return res.status(500).json({error:'Unable to complete assessment.'});}
};