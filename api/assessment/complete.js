const {authUser,rest}=require('../../lib/supabase-server');
const {scoreResponses,inferArchetypes}=require('../../lib/person-model');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});
  const {session_id}=req.body||{};
  if(!session_id)return res.status(400).json({error:'session_id is required.'});
  try{
    const rows=await rest(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${user.id}&select=item_id,response`,{accessToken:token});
    const responses={};
    for(const row of rows)responses[row.item_id]=row.response;
    const model=scoreResponses(responses);
    const archetypes=inferArchetypes(model);

    await rest('/person_model_snapshots',{method:'POST',admin:true,prefer:'return=minimal',body:{
      user_id:user.id,
      assessment_session_id:session_id,
      model_version:'wonder-person-model-v2.1',
      scores:model.dimensions,
      confidence:{coverage:model.coverage,evidence:model.evidence},
      evidence:{response_count:rows.length},
      archetypes
    }});
    await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${user.id}`,{method:'PATCH',accessToken:token,prefer:'return=minimal',body:{status:'completed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}});
    return res.status(200).json({model,archetypes,response_count:rows.length});
  }catch(e){
    console.error('assessment complete',e);
    return res.status(500).json({error:'Unable to complete assessment.'});
  }
};