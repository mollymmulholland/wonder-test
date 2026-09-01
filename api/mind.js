const {authUser}=require('../lib/supabase-server');
const {runMind}=require('../lib/wonder-mind-runtime');

function bearer(req){
  const raw=String(req.headers?.authorization||'');
  return raw.startsWith('Bearer ')?raw.slice(7):'';
}

module.exports=async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  const token=bearer(req);
  const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    const message=String(body.message||'').trim();
    if(!message)return res.status(400).json({error:'Tell Wonder what you are thinking first.'});
    const result=await runMind({
      userId:user.id,
      runType:String(body.runType||'chat'),
      message,
      history:Array.isArray(body.history)?body.history:[],
      payload:body.context||{}
    });
    return res.status(200).json(result);
  }catch(err){
    console.error('Wonder Mind runtime error',{code:err.code,message:err.message});
    if(err.code==='WONDER_MODEL_NOT_CONFIGURED')return res.status(503).json({error:'Wonder Mind inference substrate is not configured yet.',code:err.code});
    return res.status(503).json({error:'Wonder Mind could not complete this reasoning run.',code:err.code||'WONDER_MIND_ERROR'});
  }
};