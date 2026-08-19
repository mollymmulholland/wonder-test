const {authUser,rest}=require('../../lib/supabase-server');

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required.'});
  try{
    const version=req.body?.questionnaire_version||'wonder-questionnaire-v2';
    const rows=await rest('/assessment_sessions?select=*',{method:'POST',accessToken:token,prefer:'return=representation',body:{user_id:user.id,questionnaire_version:version,status:'in_progress'}});
    return res.status(200).json({session:rows[0]});
  }catch(e){
    console.error('assessment start',e);
    return res.status(500).json({error:'Unable to start assessment.'});
  }
};