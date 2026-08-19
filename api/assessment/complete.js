const {authUser,rest}=require('../../lib/supabase-server');
const {scoreResponses,inferArchetypes}=require('../../lib/person-model');
const {buildMirror}=require('../../lib/mirror-engine');

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
    const session=sessions?.[0];
    if(!session)return res.status(404).json({error:'Assessment session not found.'});

    const existing=await rest(`/person_model_snapshots?assessment_session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc&limit=1`,{accessToken:token});
    if(existing?.[0]){
      const snap=existing[0];
      const model={
        dimensions:snap.scores||{},
        evidence:snap.confidence?.evidence||{},
        coverage:Number(snap.confidence?.coverage||0)
      };
      const archetypes=Array.isArray(snap.archetypes)?snap.archetypes:[];
      const mirror=buildMirror(model,archetypes);
      return res.status(200).json({model,archetypes,mirror,response_count:Number(snap.evidence?.response_count||0),snapshot_id:snap.id,already_completed:true});
    }

    const rows=await rest(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=item_id,response`,{accessToken:token});
    if(rows.length<24)return res.status(409).json({error:'Wonder needs a little more evidence before completing this Mirror.',response_count:rows.length});

    const responses={};
    for(const row of rows)responses[row.item_id]=row.response;
    const model=scoreResponses(responses);
    const archetypes=inferArchetypes(model);
    const mirror=buildMirror(model,archetypes);

    const created=await rest('/person_model_snapshots?select=*',{
      method:'POST',admin:true,prefer:'return=representation',body:{
        user_id:user.id,
        assessment_session_id:session_id,
        model_version:'wonder-person-model-v2.1',
        scores:model.dimensions,
        confidence:{coverage:model.coverage,evidence:model.evidence},
        evidence:{response_count:rows.length},
        archetypes
      }
    });

    await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}`,{
      method:'PATCH',accessToken:token,prefer:'return=minimal',body:{status:'completed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}
    });

    return res.status(200).json({model,archetypes,mirror,response_count:rows.length,snapshot_id:created?.[0]?.id||null,already_completed:false});
  }catch(e){
    console.error('assessment complete',e);
    return res.status(500).json({error:'Unable to complete assessment.'});
  }
};