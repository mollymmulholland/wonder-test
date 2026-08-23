const {authUser,rest}=require('../../lib/supabase-server');

async function resume(userId,version,token){
  const existing=await rest(`/assessment_sessions?user_id=eq.${encodeURIComponent(userId)}&questionnaire_version=eq.${encodeURIComponent(version)}&status=eq.in_progress&select=*&order=started_at.desc&limit=1`,{accessToken:token});
  if(!existing?.[0])return null;
  const session=existing[0];
  const saved=await rest(`/assessment_responses_v2?session_id=eq.${encodeURIComponent(session.id)}&user_id=eq.${encodeURIComponent(userId)}&select=item_id,response&order=created_at.asc`,{accessToken:token});
  const responses={};for(const row of saved||[])responses[row.item_id]=row.response;
  return{session,resumed:true,responses};
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||''),token=auth.startsWith('Bearer ')?auth.slice(7):'',user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});
  const version=String(req.body?.questionnaire_version||'wonder-questionnaire-v2.2-elements').slice(0,120);
  try{
    const current=await resume(user.id,version,token);if(current)return res.status(200).json(current);
    try{
      const rows=await rest('/assessment_sessions?select=*',{method:'POST',accessToken:token,prefer:'return=representation',body:{user_id:user.id,questionnaire_version:version,status:'in_progress'}});
      if(!rows?.[0])throw new Error('Assessment session was not created.');
      return res.status(200).json({session:rows[0],resumed:false,responses:{}});
    }catch(e){
      // With the one-active-session DB invariant, simultaneous tabs/devices may race.
      // The loser resumes the winning session instead of surfacing an error.
      if(Number(e.status)===409||/duplicate|unique/i.test(String(e.message))){const raced=await resume(user.id,version,token);if(raced)return res.status(200).json(raced);}
      throw e;
    }
  }catch(e){console.error('assessment start',e);return res.status(500).json({error:'Unable to start assessment.'});}
};