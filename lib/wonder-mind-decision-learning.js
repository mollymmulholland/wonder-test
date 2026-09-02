'use strict';

function clamp(v,lo=0,hi=1){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;}
function mean(xs=[]){return xs.length?xs.reduce((a,b)=>a+Number(b||0),0)/xs.length:0;}
function normalizeOutcome(raw={}){
  const usefulness=raw.usefulness==null?null:clamp(raw.usefulness);
  const autonomy=raw.autonomy_preserved==null?null:clamp(raw.autonomy_preserved);
  const clarity=raw.clarity_gained==null?null:clamp(raw.clarity_gained);
  const emotionalCost=raw.emotional_cost==null?null:clamp(raw.emotional_cost);
  const downside=raw.downside_realized==null?null:clamp(raw.downside_realized);
  const values=raw.values_alignment==null?null:clamp(raw.values_alignment);
  const wouldChooseAgain=raw.would_choose_again==null?null:Boolean(raw.would_choose_again);
  return {usefulness,autonomy_preserved:autonomy,clarity_gained:clarity,emotional_cost:emotionalCost,downside_realized:downside,values_alignment:values,would_choose_again:wouldChooseAgain,notes:String(raw.notes||'').slice(0,3000)};
}
function observedUtility(outcome={}){
  const positive=[outcome.usefulness,outcome.autonomy_preserved,outcome.clarity_gained,outcome.values_alignment].filter(v=>v!=null);
  const negative=[outcome.emotional_cost,outcome.downside_realized].filter(v=>v!=null);
  const pos=positive.length?mean(positive):.5, neg=negative.length?mean(negative):.5;
  const repeat=outcome.would_choose_again==null?.5:(outcome.would_choose_again?1:0);
  return clamp(.56*pos+.24*(1-neg)+.20*repeat);
}
function attributionConfidence({outcome={},evidenceCount=0,timeElapsedDays=null,externalEvents=false}={}){
  const measured=['usefulness','autonomy_preserved','clarity_gained','emotional_cost','downside_realized','values_alignment','would_choose_again'].filter(k=>outcome[k]!=null).length;
  const completeness=measured/7;
  const evidence=clamp(evidenceCount/4);
  const timing=timeElapsedDays==null?.6:clamp(1-Math.max(0,Number(timeElapsedDays)-90)/180,.35,1);
  const confounding=externalEvents?.18:0;
  return clamp(.34+.34*completeness+.22*evidence+.10*timing-confounding,.15,.92);
}
function classifyDecisionQuality({predictedUtility=.5,observed=.5,recommendationConfidence=.5,chosenWasRecommended=false,attribution=.5}={}){
  const error=observed-predictedUtility;
  const regret=clamp(predictedUtility-observed,0,1);
  const surprise=Math.abs(error);
  let label='uncertain';
  if(attribution<.4)label='insufficient_attribution';
  else if(chosenWasRecommended&&observed>=.7)label='helpful_recommendation';
  else if(chosenWasRecommended&&observed<.42&&recommendationConfidence>=.65)label='overconfident_recommendation';
  else if(!chosenWasRecommended&&observed>=.72)label='missed_option_value';
  else if(observed<.35)label='poor_outcome';
  else if(surprise<=.12)label='well_calibrated_tradeoff';
  else label='mixed_outcome';
  return {label,error,regret,surprise};
}
function counterfactualRestraint({chosenBranch=null,otherBranches=[]}={}){
  if(!chosenBranch)return {retrospective_regret:null,caveat:'No chosen branch was identified.'};
  const higher=(otherBranches||[]).filter(b=>Number(b.heuristic_utility)>Number(chosenBranch.heuristic_utility));
  return {
    retrospective_regret:null,
    forgone_higher_heuristic_options:higher.map(b=>({option_id:b.option_id,label:b.label,heuristic_utility:b.heuristic_utility})),
    caveat:'Unchosen branches remain unobserved counterfactuals. Wonder may compare prior heuristics but must not claim what would have happened under them.'
  };
}
function evaluateDecisionOutcome({set={},chosenBranch=null,branches=[],outcome={},evidenceCount=0,timeElapsedDays=null,externalEvents=false}={}){
  const normalized=normalizeOutcome(outcome);
  const observed=observedUtility(normalized);
  const predicted=clamp(chosenBranch?.heuristic_utility??.5);
  const attribution=attributionConfidence({outcome:normalized,evidenceCount,timeElapsedDays,externalEvents});
  const chosenWasRecommended=Boolean(chosenBranch&&set.recommended_option_id===chosenBranch.option_id);
  const quality=classifyDecisionQuality({predictedUtility:predicted,observed,recommendationConfidence:set.recommendation_confidence,chosenWasRecommended,attribution});
  const calibrationWeight=clamp(attribution*(.55+.45*Math.min(1,Math.abs(predicted-.5)*2)));
  return {
    chosen_option_id:chosenBranch?.option_id||null,
    chosen_was_recommended:chosenWasRecommended,
    predicted_heuristic_utility:predicted,
    observed_utility:observed,
    attribution_confidence:attribution,
    recommendation_confidence:clamp(set.recommendation_confidence||0),
    quality_label:quality.label,
    utility_error:quality.error,
    regret_signal:quality.regret,
    surprise:quality.surprise,
    calibration_weight:calibrationWeight,
    normalized_outcome:normalized,
    counterfactual_restraint:counterfactualRestraint({chosenBranch,otherBranches:branches.filter(b=>b.id!==chosenBranch?.id)}),
    learning_rule:learningRule(quality,attribution),
    policy_version:'wonder-decision-outcome-learning-v1'
  };
}
function learningRule(quality,attribution){
  if(attribution<.4)return 'Do not materially update decision policy; attribution is too weak.';
  if(quality.label==='overconfident_recommendation')return 'Reduce confidence for similar recommendations and inspect which tradeoff dimension was overweighted.';
  if(quality.label==='missed_option_value')return 'Inspect whether policy was overly conservative; do not assume the unchosen recommendation would have performed worse.';
  if(quality.label==='helpful_recommendation')return 'Reinforce cautiously; one successful decision does not establish a global policy rule.';
  if(quality.label==='poor_outcome')return 'Record downside evidence and inspect reversibility, pressure, and value-alignment weights.';
  return 'Accumulate additional independent outcomes before changing decision weights materially.';
}
function aggregateDecisionMetrics(rows=[]){
  const usable=(rows||[]).filter(r=>Number(r.attribution_confidence)>=.4);
  if(!usable.length)return {sample_size:0,mean_observed_utility:null,mean_regret_signal:null,mean_absolute_utility_error:null,recommended_outcome_utility:null,nonrecommended_outcome_utility:null,overconfidence_rate:null};
  const recommended=usable.filter(r=>r.chosen_was_recommended),notRecommended=usable.filter(r=>!r.chosen_was_recommended);
  return {
    sample_size:usable.length,
    mean_observed_utility:mean(usable.map(r=>r.observed_utility)),
    mean_regret_signal:mean(usable.map(r=>r.regret_signal)),
    mean_absolute_utility_error:mean(usable.map(r=>Math.abs(r.utility_error))),
    recommended_outcome_utility:recommended.length?mean(recommended.map(r=>r.observed_utility)):null,
    nonrecommended_outcome_utility:notRecommended.length?mean(notRecommended.map(r=>r.observed_utility)):null,
    overconfidence_rate:usable.filter(r=>r.quality_label==='overconfident_recommendation').length/usable.length
  };
}

module.exports={normalizeOutcome,observedUtility,attributionConfidence,classifyDecisionQuality,evaluateDecisionOutcome,aggregateDecisionMetrics};
