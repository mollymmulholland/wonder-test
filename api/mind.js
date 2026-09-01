'use strict';

const {authUser,rest}=require('../lib/supabase-server');
const {runMind,loadUserContext,PURPOSE_BY_RUN}=require('../lib/wonder-mind-runtime');
const {loadDyadContext}=require('../lib/wonder-mind-dyad');
const {planCuriosity,markQuestionAsked,recordQuestionAnswer}=require('../lib/wonder-mind-active-learning');
const {planExecutiveInformationPolicy}=require('../lib/wonder-mind-executive-policy');

const RUN_TYPES=new Set(['chat','journal','mirror','assessment','match','post_date','relationship']);
const MAX_MESSAGE=8000;
const MAX_HISTORY=12;

function bearer(req){const raw=String(req.headers?.authorization||'');return raw.startsWith('Bearer ')?raw.slice(7):'';}
function cleanHistory(history){return (Array.isArray(history)?history:[]).slice(-MAX_HISTORY).map(m=>({role:m?.role==='assistant'||m?.role==='wonder'?'assistant':'user',text:String(m?.text||m?.content||'').slice(0,4000)})).filter(m=>m.text.trim());}
async function enforceRunRate(userId){const since=new Date(Date.now()-60_000).toISOString();const recent=await rest(`/wonder_mind_inference_runs?user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=9`,{admin:true});if(recent.length>=8){const err=new Error('Reasoning rate exceeded');err.code='WONDER_MIND_RATE_LIMIT';throw err;}}

async function loadRecentQuestions(userId){
  return rest(`/wonder_mind_question_proposals?user_id=eq.${encodeURIComponent(userId)}&select=id,construct_key,status,asked_at,created_at&order=created_at.desc&limit=20`,{admin:true});
}

async function curiosityAction(userId,body){
  const runType=RUN_TYPES.has(String(body.runType||''))?String(body.runType):'chat';
  const purposes=PURPOSE_BY_RUN[runType]||PURPOSE_BY_RUN.chat;
  const candidateUserId=body.context?.candidateUserId||body.context?.objectUserId||null;
  const [context,dyadContext]=await Promise.all([loadUserContext(userId,purposes),candidateUserId&&['match','post_date','relationship'].includes(runType)?loadDyadContext(userId,candidateUserId):Promise.resolve(null)]);
  const plan=await planCuriosity({runId:null,userId,candidateUserId,purposes,context,dyadContext,maxQuestions:Math.max(1,Math.min(3,Number(body.maxQuestions)||1))});
  if(body.markAsked&&plan.topQuestion?.id)await markQuestionAsked({questionId:plan.topQuestion.id,userId});
  return {mode:'curiosity',runType,topQuestion:plan.topQuestion,questions:plan.questions,uncertainty:plan.uncertainty.slice(0,5)};
}

async function executivePolicyAction(userId,body){
  const runType=RUN_TYPES.has(String(body.runType||''))?String(body.runType):'chat';
  const purposes=PURPOSE_BY_RUN[runType]||PURPOSE_BY_RUN.chat;
  const candidateUserId=body.context?.candidateUserId||body.context?.objectUserId||null;
  const [context,dyadContext,recentQuestions]=await Promise.all([
    loadUserContext(userId,purposes),
    candidateUserId&&['match','post_date','relationship'].includes(runType)?loadDyadContext(userId,candidateUserId):Promise.resolve(null),
    loadRecentQuestions(userId)
  ]);
  const plan=planExecutiveInformationPolicy({runType,message:String(body.message||''),purposes,context,dyadContext,recentQuestions,candidateUserId});
  const rows=await rest('/wonder_mind_information_policy_decisions?select=id',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,run_id:null,run_type:runType,action:plan.action,decision_confidence:plan.confidence,evidence_adequacy:plan.evidence_adequacy,response_burden:plan.response_burden,highest_uncertainty:plan.highest_uncertainty||{},proposed_question:plan.proposed_question||null,risk:plan.risk||{},reason:plan.reason,policy_version:plan.policy_version}});
  return {mode:'executive_policy',decisionId:rows[0]?.id||null,runType,action:plan.action,confidence:plan.confidence,reason:plan.reason,evidenceAdequacy:plan.evidence_adequacy,responseBurden:plan.response_burden,highestUncertainty:plan.highest_uncertainty,proposedQuestion:plan.proposed_question,uncertainty:plan.uncertainty_map.slice(0,5),risk:plan.risk,policyVersion:plan.policy_version};
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store, private');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const token=bearer(req),user=await authUser(token);if(!user?.id)return res.status(401).json({error:'Authentication required'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    if(body.action==='curiosity')return res.status(200).json(await curiosityAction(user.id,body));
    if(body.action==='executive_policy')return res.status(200).json(await executivePolicyAction(user.id,body));
    if(body.action==='question_answered'){
      if(!body.questionId||!body.answerEventId)return res.status(400).json({error:'questionId and answerEventId are required.'});
      await recordQuestionAnswer({questionId:String(body.questionId),userId:user.id,answerEventId:String(body.answerEventId)});
      return res.status(200).json({ok:true});
    }
    const message=String(body.message||'').trim();
    if(!message)return res.status(400).json({error:'Tell Wonder what you are thinking first.'});
    if(message.length>MAX_MESSAGE)return res.status(413).json({error:'This reflection is too long for a single reasoning turn.'});
    const requestedType=String(body.runType||'chat'),runType=RUN_TYPES.has(requestedType)?requestedType:'chat';
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
