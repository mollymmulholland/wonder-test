'use strict';

const {authUser,rest}=require('../lib/supabase-server');
const {runMind}=require('../lib/wonder-mind-runtime');

const RUN_TYPES=new Set(['chat','journal','mirror','assessment','match','post_date','relationship']);
const MAX_MESSAGE=8000;
const MAX_HISTORY=12;

function bearer(req){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7):'';}
function cleanHistory(history){
  return (Array.isArray(history)?history:[]).slice(-MAX_HISTORY).map(m=>({
    role:m?.role==='assistant'||m?.role==='wonder'?'assistant':'user',
    text:String(m?.text||m?.content||'').slice(0,4000)
  })).filter(m=>m.text.trim());
}

async function enforceRunRate(userId){
  const since=new Date(Date.now()-60_000).toISOString();
  const recent=await rest(`/wonder_mind_inference_runs?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=9`,{admin:true});
  if(recent.length>=8){const err=new Error('Reasoning rate exceeded');err.code='WONDER_MIND_RATE_LIMIT';throw err;}
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const token=bearer(req);const user=await authUser(token);
  if(!user?.id)return res.status(401).json({error:'Authentication required'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    const message=String(body.message||'').trim();
    if(!message)return res.status(400).json({error:'Tell Wonder what you are thinking first.'});
    if(message.length>MAX_MESSAGE)return res.status(413).json({error:'This reflection is too long for a single reasoning turn.'});
    const requestedType=String(body.runType||'chat');
    const runType=RUN_TYPES.has(requestedType)?requestedType:'chat';
    await enforceRunRate(user.id);
    const result=await runMind({userId:user.id,runType,message,history:cleanHistory(body.history),payload:body.context&&typeof body.context==='object'?body.context:{}});
    return res.status(200).json(result);
  }catch(err){
    console.error('Wonder Mind runtime error',{code:err.code,message:err.message});
    if(err.code==='WONDER_MIND_RATE_LIMIT')return res.status(429).json({error:'Wonder needs a moment before another reasoning turn.',code:err.code});
    if(err.code==='WONDER_MODEL_NOT_CONFIGURED')return res.status(503).json({error:'Wonder Mind inference substrate is not configured yet.',code:err.code});
    if(err.code==='WONDER_MODEL_TIMEOUT')return res.status(504).json({error:'Wonder Mind took too long to complete this reasoning run.',code:err.code});
    return res.status(503).json({error:'Wonder Mind could not complete this reasoning run.',code:err.code||'WONDER_MIND_ERROR'});
  }
};
