'use strict';

const SOURCE_WEIGHTS={
  direct_user_report:1.0,
  user_correction:1.15,
  observed_outcome:1.25,
  longitudinal_self_report:.9,
  structured_assessment:.8,
  conversation_history:.45,
  research_construct:.35,
  prior_model_inference:.12
};

const PERSON_SPECIFIC=new Set(['direct_user_report','user_correction','observed_outcome','longitudinal_self_report','structured_assessment']);
const EXTERNAL_TO_MODEL=new Set(['direct_user_report','user_correction','observed_outcome','longitudinal_self_report','structured_assessment','conversation_history']);

function clamp(n,lo=0,hi=1){n=Number(n);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):lo;}

function buildEvidenceProfile({runType='chat',knowledgeCount=0,memoryCount=0,outcomeCount=0,correctionCount=0,personModelCount=0,journalCount=0,historyCount=0,dyadOutcomeCount=0,currentMessage=true}={}){
  const counts={
    direct_user_report:currentMessage?1:0,
    user_correction:Number(correctionCount)||0,
    observed_outcome:(Number(outcomeCount)||0)+(Number(dyadOutcomeCount)||0),
    longitudinal_self_report:Number(journalCount)||0,
    structured_assessment:Number(personModelCount)||0,
    conversation_history:Number(historyCount)||0,
    research_construct:Number(knowledgeCount)||0,
    prior_model_inference:Number(memoryCount)||0
  };
  const families=Object.entries(counts).filter(([,n])=>n>0).map(([k])=>k);
  const independentFamilies=families.filter(f=>PERSON_SPECIFIC.has(f));
  const externalFamilies=families.filter(f=>EXTERNAL_TO_MODEL.has(f));
  const weightedIndependence=Object.entries(counts).reduce((sum,[family,n])=>sum+(n>0?(SOURCE_WEIGHTS[family]||0)*Math.min(1,Math.log2(n+1)):0),0);
  const selfWeight=(counts.prior_model_inference||0)*(SOURCE_WEIGHTS.prior_model_inference||0);
  const externalWeight=externalFamilies.reduce((sum,f)=>sum+(SOURCE_WEIGHTS[f]||0),0);
  const contaminationScore=clamp(selfWeight/(selfWeight+externalWeight+0.0001));
  let confidenceCeiling=.45;
  if(independentFamilies.length>=1)confidenceCeiling=.62;
  if(independentFamilies.length>=2)confidenceCeiling=.76;
  if(independentFamilies.length>=3)confidenceCeiling=.86;
  if(counts.observed_outcome>=2||counts.user_correction>=1)confidenceCeiling=Math.min(.92,confidenceCeiling+.04);
  if(contaminationScore>.45)confidenceCeiling=Math.min(confidenceCeiling,.58);
  if(contaminationScore>.65)confidenceCeiling=Math.min(confidenceCeiling,.48);
  const flags=[];
  if(memoryCount>0&&externalFamilies.length===0)flags.push('self_reference_only');
  if(contaminationScore>.45)flags.push('high_model_contamination');
  if(independentFamilies.length<2)flags.push('low_independent_evidence_diversity');
  if(runType==='match'&&dyadOutcomeCount===0)flags.push('pre_interaction_only');
  return {counts,sourceFamilies:families,independentFamilies,independentSourceCount:independentFamilies.length,weightedIndependence:Number(weightedIndependence.toFixed(4)),contaminationScore:Number(contaminationScore.toFixed(4)),confidenceCeiling:Number(confidenceCeiling.toFixed(4)),flags};
}

function constrainConfidence(confidence,profile){return Math.min(clamp(confidence),clamp(profile?.confidenceCeiling??1));}

function evidenceInstruction(profile){
  if(!profile)return '';
  return `EVIDENCE INDEPENDENCE AUDIT\nIndependent person-specific source families: ${profile.independentSourceCount}.\nModel-contamination score: ${profile.contaminationScore}.\nMaximum warranted confidence from evidence diversity: ${profile.confidenceCeiling}.\nFlags: ${(profile.flags||[]).join(', ')||'none'}.\nDo not count prior Wonder inferences, summaries, or memories as independent confirmation of themselves. Research can validate a construct but cannot establish that this specific person has that construct. User correction and observed outcomes outrank prior model-generated interpretations.`;
}

module.exports={SOURCE_WEIGHTS,buildEvidenceProfile,constrainConfidence,evidenceInstruction};
