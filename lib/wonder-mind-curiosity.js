'use strict';

const DOMAIN_SPECS={
  identity:{weight:.70,stakes:.55,actionability:.75},
  values:{weight:.90,stakes:.85,actionability:.90},
  attachment:{weight:.72,stakes:.72,actionability:.70},
  recognition:{weight:.88,stakes:.82,actionability:.88},
  attraction:{weight:.82,stakes:.76,actionability:.72},
  dyad:{weight:1.00,stakes:.92,actionability:.94},
  development:{weight:.76,stakes:.70,actionability:.82},
  context:{weight:.66,stakes:.64,actionability:.74},
  readiness:{weight:.86,stakes:.84,actionability:.90}
};

const QUESTION_LIBRARY=[
  {domain:'values',construct_key:'values-nonnegotiables',question:'When a relationship is genuinely good but asks you to compromise something important, what are you least willing to compromise?',sensitivity:'private',purposes:['self_understanding','matching','relationship_guidance']},
  {domain:'recognition',construct_key:'felt-recognition',question:'What does someone do that makes you feel accurately understood rather than merely liked?',sensitivity:'private',purposes:['self_understanding','matching','relationship_learning']},
  {domain:'attraction',construct_key:'revealed-attraction',question:'Think of someone who surprised you by becoming attractive to you. What changed your experience of them?',sensitivity:'private',purposes:['self_understanding','matching']},
  {domain:'attachment',construct_key:'regulation-under-distance',question:'When someone you care about becomes less available, what changes first in you: your thoughts, your behavior, your body, or your desire for closeness?',sensitivity:'private',purposes:['self_understanding','relationship_guidance']},
  {domain:'dyad',construct_key:'conflict-repair',question:'After tension with someone you care about, what kind of response actually helps you feel reconnected?',sensitivity:'private',purposes:['matching','relationship_learning','relationship_guidance']},
  {domain:'development',construct_key:'self-expansion',question:'In your healthiest relationships, what becomes easier for you to be, try, or express?',sensitivity:'private',purposes:['self_understanding','matching','relationship_learning']},
  {domain:'context',construct_key:'life-architecture',question:'What part of your current life would be hardest to reorganize for a serious relationship?',sensitivity:'private',purposes:['matching','self_understanding']},
  {domain:'readiness',construct_key:'relationship-readiness',question:'What would make a promising relationship difficult for you to sustain right now, even with the right person?',sensitivity:'private',purposes:['matching','self_understanding']},
  {domain:'identity',construct_key:'authenticity-context',question:'In what kinds of situations do you notice yourself editing or performing your personality most?',sensitivity:'private',purposes:['self_understanding','relationship_guidance']},
  {domain:'dyad',construct_key:'curiosity-collapse',question:'What usually causes your curiosity about someone to deepen, and what causes it to collapse?',sensitivity:'private',purposes:['matching','relationship_learning']}
];

function clamp(v,lo=0,hi=1){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;}
function entropyFromConfidence(confidence){
  const c=clamp(confidence);
  const p=.5+Math.abs(c-.5);
  if(p<=0||p>=1)return 0;
  return -(p*Math.log2(p)+(1-p)*Math.log2(1-p));
}
function evidenceStrength({evidenceCount=0,independentSourceCount=0,contradictionCount=0,contaminationScore=0}={}){
  const countTerm=1-Math.exp(-Math.max(0,evidenceCount)/3);
  const independentTerm=1-Math.exp(-Math.max(0,independentSourceCount)/2);
  const contradictionPenalty=Math.min(.55,Math.max(0,contradictionCount)*.12);
  const contaminationPenalty=clamp(contaminationScore)*.45;
  return clamp(.46*countTerm+.54*independentTerm-contradictionPenalty-contaminationPenalty);
}
function uncertaintyFromEvidence(input={}){
  const evidence=1-evidenceStrength(input);
  const contradiction=Math.min(1,(input.contradictionCount||0)/3);
  const contamination=clamp(input.contaminationScore||0);
  return clamp(.62*evidence+.23*contradiction+.15*contamination);
}
function expectedInformationGain({uncertainty,stakes=.5,actionability=.5,novelty=1,responseCost=.2}={}){
  const u=clamp(uncertainty),s=clamp(stakes),a=clamp(actionability),n=clamp(novelty),cost=clamp(responseCost);
  return clamp(u*(.42+.24*s+.24*a+.10*n)*(1-.42*cost));
}
function questionCost(question=''){const words=String(question).trim().split(/\s+/).filter(Boolean).length;return clamp(.12+Math.max(0,words-16)*.008,.12,.42);}
function recentlyAskedPenalty(constructKey,recentQuestions=[]){
  const recent=(recentQuestions||[]).slice(0,12);
  const idx=recent.findIndex(q=>q.construct_key===constructKey);
  if(idx<0)return 0;
  return Math.max(.15,.75-(idx*.08));
}

function buildUncertaintyMap({memories=[],personModels=[],outcomes=[],corrections=[],dyadOutcomes=[],candidateMemories=[]}={}){
  const map={};
  for(const [domain,spec] of Object.entries(DOMAIN_SPECS))map[domain]={domain,uncertainty:.72,stakes:spec.stakes,actionability:spec.actionability,evidence_count:0,independent_source_count:0,contradiction_count:0,contamination_score:0};
  const domainForKey=k=>{
    const x=String(k||'').toLowerCase();
    if(/value|meaning|purpose/.test(x))return 'values'; if(/attach|reassur|autonom|distance|regulat/.test(x))return 'attachment';
    if(/recogn|understood|empath|curios/.test(x))return 'recognition'; if(/attract|desire|chemistry/.test(x))return 'attraction';
    if(/dyad|conflict|repair|reciproc|commit/.test(x))return 'dyad'; if(/grow|develop|becom|expand/.test(x))return 'development';
    if(/readiness|timing/.test(x))return 'readiness'; if(/context|family|work|location|life-architecture/.test(x))return 'context'; return 'identity';
  };
  for(const m of [...memories,...candidateMemories]){
    const d=domainForKey(m.memory_key||m.claim),row=map[d];
    row.evidence_count+=(m.evidence_count||1); row.independent_source_count=Math.max(row.independent_source_count,m.independent_source_count||0); row.contradiction_count+=(m.contradiction_count||0); row.contamination_score=Math.max(row.contamination_score,Number(m.contamination_score)||0);
  }
  if(personModels.length){map.identity.evidence_count+=personModels.length;map.identity.independent_source_count+=1;map.values.evidence_count+=personModels.length;map.values.independent_source_count+=1;}
  if(corrections.length){map.identity.evidence_count+=corrections.length;map.identity.independent_source_count+=1;map.identity.contradiction_count+=corrections.length;}
  if(outcomes.length){for(const d of ['recognition','attraction','dyad','development']){map[d].evidence_count+=outcomes.length;map[d].independent_source_count+=1;}}
  if(dyadOutcomes.length){for(const d of ['recognition','attraction','dyad']){map[d].evidence_count+=dyadOutcomes.length;map[d].independent_source_count+=1;}}
  return Object.values(map).map(row=>({...row,uncertainty:uncertaintyFromEvidence(row)})).sort((a,b)=>(b.uncertainty*b.stakes)-(a.uncertainty*a.stakes));
}

function rankQuestions({uncertaintyMap=[],purposes=[],recentQuestions=[],max=3}={}){
  const byDomain=Object.fromEntries((uncertaintyMap||[]).map(x=>[x.domain,x]));
  return QUESTION_LIBRARY.filter(q=>!q.purposes.length||q.purposes.some(p=>purposes.includes(p))).map(q=>{
    const state=byDomain[q.domain]||{uncertainty:.65,stakes:DOMAIN_SPECS[q.domain]?.stakes||.5,actionability:DOMAIN_SPECS[q.domain]?.actionability||.5};
    const penalty=recentlyAskedPenalty(q.construct_key,recentQuestions);
    const eig=expectedInformationGain({...state,novelty:1-penalty,responseCost:questionCost(q.question)});
    return {...q,expected_information_gain:clamp(eig*(1-penalty)),uncertainty_before:state.uncertainty,rationale:`Reduces uncertainty in ${q.domain}; current uncertainty ${state.uncertainty.toFixed(2)}.`};
  }).sort((a,b)=>b.expected_information_gain-a.expected_information_gain).slice(0,max);
}

function selectNextQuestion(args={}){return rankQuestions({...args,max:1})[0]||null;}

function assessmentInformationGain({itemDimensions=[],evidence={},matchCritical=new Set(),tensionDims=new Set(),discriminatorDims=new Set(),answeredInSection=0,recentSectionRepeated=false,type='choice'}={}){
  let uncertainty=0,importance=0;
  for(const d of itemDimensions){const ev=Number(evidence[d]||0),target=matchCritical.has(d)?2:1.25;uncertainty+=clamp((target-ev)/target);importance+=matchCritical.has(d)?1:.58;if(tensionDims.has(d))importance+=.55;if(discriminatorDims.has(d))importance+=.32;}
  const n=Math.max(1,itemDimensions.length);uncertainty/=n;importance=clamp(importance/(n*1.45));
  const novelty=clamp(1-answeredInSection*.08-(recentSectionRepeated?.28:0));
  const responseCost=type==='scale'?.12:.18;
  return expectedInformationGain({uncertainty,stakes:importance,actionability:.88,novelty,responseCost});
}

module.exports={DOMAIN_SPECS,QUESTION_LIBRARY,entropyFromConfidence,evidenceStrength,uncertaintyFromEvidence,expectedInformationGain,buildUncertaintyMap,rankQuestions,selectNextQuestion,assessmentInformationGain};