'use strict';

const {rest}=require('./supabase-server');
const {buildUncertaintyMap,rankQuestions}=require('./wonder-mind-curiosity');

async function recentQuestionHistory(userId,limit=20){
  return rest(`/wonder_mind_question_proposals?user_id=eq.${encodeURIComponent(userId)}&select=id,domain,construct_key,question,status,expected_information_gain,created_at&order=created_at.desc&limit=${Math.max(1,Math.min(100,limit))}`,{admin:true});
}

async function persistUncertaintyStates({runId,userId,candidateUserId=null,states=[]}){
  if(!states.length)return [];
  const body=states.map(s=>({run_id:runId,user_id:userId,candidate_user_id:candidateUserId,domain:s.domain,construct_key:`domain-${s.domain}`,uncertainty:s.uncertainty,evidence_count:s.evidence_count||0,independent_source_count:s.independent_source_count||0,contradiction_count:s.contradiction_count||0,stakes:s.stakes,actionability:s.actionability,state:{contamination_score:s.contamination_score||0}}));
  return rest('/wonder_mind_uncertainty_states?select=id,domain,uncertainty',{method:'POST',admin:true,prefer:'return=representation',body});
}

async function persistQuestionProposals({runId,userId,candidateUserId=null,purposes=[],questions=[]}){
  if(!questions.length)return [];
  const body=questions.map(q=>({run_id:runId,user_id:userId,candidate_user_id:candidateUserId,domain:q.domain,construct_key:q.construct_key,question:q.question,rationale:q.rationale,expected_information_gain:q.expected_information_gain,uncertainty_before:q.uncertainty_before,sensitivity:q.sensitivity||'private',consent_scope:purposes,status:'proposed'}));
  return rest('/wonder_mind_question_proposals?select=id,domain,construct_key,question,expected_information_gain,uncertainty_before,status',{method:'POST',admin:true,prefer:'return=representation',body});
}

async function planCuriosity({runId,userId,candidateUserId=null,purposes=[],context={},dyadContext=null,maxQuestions=3}){
  const recent=await recentQuestionHistory(userId,24);
  const states=buildUncertaintyMap({memories:context.memory||[],personModels:context.personModels||[],outcomes:context.recentOutcomes||[],corrections:context.mirrorCorrections||[],dyadOutcomes:dyadContext?.outcomeHistory||[],candidateMemories:dyadContext?.candidate?.matchingMemories||[]});
  const ranked=rankQuestions({uncertaintyMap:states,purposes,recentQuestions:recent,max:maxQuestions});
  const [storedStates,storedQuestions]=await Promise.all([
    persistUncertaintyStates({runId,userId,candidateUserId,states}),
    persistQuestionProposals({runId,userId,candidateUserId,purposes,questions:ranked})
  ]);
  return {uncertainty:states,questions:storedQuestions,topQuestion:storedQuestions[0]||null,persistedStateCount:storedStates.length};
}

async function markQuestionAsked({questionId,userId}){
  const now=new Date().toISOString();
  await rest(`/wonder_mind_question_proposals?id=eq.${encodeURIComponent(questionId)}&user_id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:'asked',asked_at:now}});
}

async function recordQuestionAnswer({questionId,userId,answerEventId}){
  const now=new Date().toISOString();
  await rest(`/wonder_mind_question_proposals?id=eq.${encodeURIComponent(questionId)}&user_id=eq.${encodeURIComponent(userId)}`,{method:'PATCH',admin:true,prefer:'return=minimal',body:{status:'answered',answered_at:now,answer_event_id:answerEventId}});
}

module.exports={planCuriosity,recentQuestionHistory,persistUncertaintyStates,persistQuestionProposals,markQuestionAsked,recordQuestionAnswer};