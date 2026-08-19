const {authUser,rest}=require('../../lib/supabase-server');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});

  const {session_id,item_id,response,response_time_ms,changed_count}=req.body||{};
  if(!session_id||!item_id||response===undefined)return res.status(400).json({error:'session_id, item_id, and response are required.'});

  try{
    const sessions=await rest(`/assessment_sessions?id=eq.${encodeURIComponent(session_id)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.in_progress&select=id&limit=1`,{accessToken:token});
    if(!sessions?.[0])return res.status(409).json({error:'Assessment session is not active.'});

    await rest(`/assessment_responses_v2?on_conflict=session_id,item_id`,{
      method:'POST',
      accessToken:token,
      prefer:'resolution=merge-duplicates,return=minimal',
      body:{
        session_id,
        user_id:user.id,
        item_id,
        response,
        response_time_ms:Number.isFinite(Number(response_time_ms))?Number(response_time_ms):null,
        changed_count:Math.max(0,Number(changed_count||0)),
        updated_at:new Date().toISOString()
      }
    });
    return res.status(200).json({ok:true});
  }catch(e){
    console.error('assessment respond',e);
    return res.status(500).json({error:'Unable to save response.'});
  }
};