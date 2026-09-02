'use strict';

const {buildUncertaintyMap,selectNextQuestion}=require('./wonder-mind-curiosity');

const ACTIONS=['answer','ask','observe','abstain'];
const RUN_STAKES={chat:.45,journal:.40,mirror:.62,assessment:.55,match:.86,post_date:.72,relationship:.76};

function clamp(v,lo=0,hi=1){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;}
function mean(xs=[]){return xs.length?xs.reduce((a,b)=>a+Number(b||0),0)/xs.length:0;}

function evidenceAdequacy({context={},dyadContext=null}={}){
  const memories=context.memory||[], outcomes=context.recentOutcomes||[], corrections=context.mirrorCorrections||[], models=context.personModels||[];
  const independent=mean(memories.map(m=>m.independent_source_count||0));
  const contamination=mean(memories.map(m=>m.contamination_score||0));
  const longitudinal=Math.min(1,(models.length+outcomes.length+(dyadContext?.outcomeHistory?.length||0))/6);
  const direct=Math.min(1,(corrections.length+outcomes.length+(dyadContext?.outcomeHistory?.length||0))/5);
  return clamp(.30*Math.min(1,independent/2)+.30*longitudinal+.28*direct+.12*(1-contamination));
}

function responseBurden({recentQuestions=[],communication=null}={}){
  const unanswered=(recentQuestions||[]).filter(q=>q.status==='proposed'||q.status==='asked').length;
  const questionDensity=communication?.question_density==null?.5:clamp(communication.question_density);
  return clamp(.18+.12*Math.min(4,unanswered)+.20*(1-questionDensity));
}

function highRiskReasoning({runType,message='',candidateUserId=null}={}){
  const text=String(message).toLowerCase();
  const diagnosis=/diagnos|personality disorder|bipolar|narcissist|psychopath|sociopath/.test(text);
  const mindReading=/what (does|is) (he|she|they).*feel|secretly feels|exactly what .* thinks/.test(text);
  const coercive=/make (him|her|them)|manipulat|jealous|obsess|dependent/.test(text);
  const thirdParty=Boolean(candidateUserId)||mindReading;
  return {diagnosis,mindReading,coercive,thirdParty,hardStop:diagnosis||coercive};
}

function chooseAction({runType='chat',uncertaintyMap=[],adequacy=.5,topQuestion=null,burden=.3,risk={}}={}){
  const stakes=RUN_STAKES[runType]??.5;
  const top=uncertaintyMap[0]||{uncertainty:.7,stakes:.5};
  const criticalUncertainty=clamp(top.uncertainty*(.55+.45*(top.stakes||stakes)));
  const informationValue=clamp(topQuestion?.expected_information_gain||0);
  if(risk.hardStop)return {action:'abstain',confidence:.98,reason:'Constitutional safety boundary overrides information acquisition.'};
  if(risk.mindReading&&adequacy<.75)return {action:'ask',confidence:.86,reason:'Third-party interiority is underdetermined; ask for observable evidence rather than infer hidden mental state.'};
  if(stakes>=.8&&adequacy<.42&&informationValue<.30)return {action:'observe',confidence:.82,reason:'The decision is consequential, evidence is weak, and no available question is likely to reduce uncertainty enough yet.'};
  if(informationValue>=.34&&criticalUncertainty>=.46&&burden<.72)return {action:'ask',confidence:clamp(.62+.30*informationValue),reason:'One targeted question has high expected information value relative to its response cost.'};
  if(adequacy>=.48&&criticalUncertainty<=.62)return {action:'answer',confidence:clamp(.55+.35*adequacy),reason:'Evidence is adequate for a bounded answer if uncertainty is stated explicitly.'};
  if(stakes>=.70&&adequacy<.48)return {action:'observe',confidence:.76,reason:'More real-world evidence is preferable to manufacturing a consequential conclusion.'};
  return {action:'answer',confidence:.62,reason:'A provisional answer is more useful than additional questioning, provided confidence remains bounded.'};
}

function planExecutiveInformationPolicy({runType='chat',message='',purposes=[],context={},dyadContext=null,recentQuestions=[],candidateUserId=null}={}){
  const uncertaintyMap=buildUncertaintyMap({memories:context.memory||[],personModels:context.personModels||[],outcomes:context.recentOutcomes||[],corrections:context.mirrorCorrections||[],dyadOutcomes:dyadContext?.outcomeHistory||[],candidateMemories:dyadContext?.candidate?.matchingMemories||[]});
  const topQuestion=selectNextQuestion({uncertaintyMap,purposes,recentQuestions});
  const adequacy=evidenceAdequacy({context,dyadContext});
  const burden=responseBurden({recentQuestions,communication:context.communication});
  const risk=highRiskReasoning({runType,message,candidateUserId});
  const decision=chooseAction({runType,uncertaintyMap,adequacy,topQuestion,burden,risk});
  return {
    ...decision,
    run_type:runType,
    evidence_adequacy:adequacy,
    response_burden:burden,
    highest_uncertainty:uncertaintyMap[0]||null,
    proposed_question:decision.action==='ask'?topQuestion:null,
    uncertainty_map:uncertaintyMap,
    risk,
    policy_version:'wonder-executive-information-policy-v1'
  };
}

function policyInstruction(plan={}){
  const q=plan.proposed_question?.question?` If you ask, ask this question or a semantically equivalent one: ${plan.proposed_question.question}`:'';
  return `EXECUTIVE INFORMATION POLICY\nChosen action: ${plan.action}. Reason: ${plan.reason} Evidence adequacy=${Number(plan.evidence_adequacy||0).toFixed(2)}; response burden=${Number(plan.response_burden||0).toFixed(2)}.${q}\nDo not override this policy merely to sound helpful. If action=observe, explain what evidence should be allowed to emerge. If action=abstain, preserve autonomy and state the boundary. If action=answer, keep conviction proportional to evidence.`;
}

module.exports={ACTIONS,RUN_STAKES,evidenceAdequacy,responseBurden,highRiskReasoning,chooseAction,planExecutiveInformationPolicy,policyInstruction};
