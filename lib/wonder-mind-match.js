'use strict';

const {compatibility}=require('./matching-engine');

const DIMENSIONS=['life_feasibility','values_meaning_alignment','relational_fit','attraction_plausibility','recognition_responsiveness_potential','growth_compatibility','readiness_timing'];

function clamp01(n){return Math.max(0,Math.min(1,Number(n)||0));}
function mean(xs){const vals=xs.filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;}

function buildMatchPrior(subject={},candidate={}){
  const deterministic=compatibility(subject,candidate);
  if(!deterministic.eligible){
    return {
      eligible:false,
      hard_conflicts:deterministic.hard_conflicts,
      hard_details:deterministic.hard_details,
      dimensions:{},
      prior_confidence:deterministic.confidence,
      uncertainty:1-deterministic.confidence,
      decision:'do_not_rank',
      engine_version:`${deterministic.engine_version}+mind-prior-v1`
    };
  }
  const c=deterministic.components||{};
  const values=c.values==null?null:clamp01(c.values);
  const relational=mean([c.relationship,c.interaction]);
  const cognitive=c.cognitive==null?null:clamp01(c.cognitive);
  const feasibility=deterministic.hard_details?.distance_miles==null?.65:deterministic.hard_details.distance_miles<=15?.95:deterministic.hard_details.distance_miles<=50?.82:.68;

  // Deliberately conservative priors. Attraction, recognition and growth are not inferred as facts from static profiles.
  const dimensions={
    life_feasibility:feasibility,
    values_meaning_alignment:values,
    relational_fit:relational,
    attraction_plausibility:null,
    recognition_responsiveness_potential:null,
    growth_compatibility:mean([values,cognitive]),
    readiness_timing:null
  };
  const observed=Object.values(dimensions).filter(Number.isFinite);
  const priorConfidence=clamp01((deterministic.confidence*.7)+(observed.length/DIMENSIONS.length)*.3);
  return {
    eligible:true,
    hard_conflicts:[],
    hard_details:deterministic.hard_details,
    dimensions,
    deterministic_components:c,
    prior_confidence:Math.round(priorConfidence*100)/100,
    uncertainty:Math.round((1-priorConfidence)*100)/100,
    rationale:deterministic.rationale,
    decision:'mind_review_required',
    epistemic_note:'This is a pre-interaction prior, not a compatibility verdict. Dyadic outcomes must update it.',
    engine_version:`${deterministic.engine_version}+mind-prior-v1`
  };
}

function outcomeSignal(outcome={}){
  const normalize5=v=>Number.isFinite(Number(v))?clamp01((Number(v)-1)/4):null;
  return {
    recognition:normalize5(outcome.felt_understood),
    ease:normalize5(outcome.conversational_ease),
    attraction:normalize5(outcome.attraction),
    safety:normalize5(outcome.emotional_safety),
    intellectual:normalize5(outcome.intellectual_stimulation),
    values:normalize5(outcome.values_fit),
    continuation:outcome.wanted_second_date==null?null:(outcome.wanted_second_date?1:0)
  };
}

function summarizeDyadicEvidence(outcomes=[]){
  const signals=outcomes.map(outcomeSignal);
  const avg=key=>mean(signals.map(s=>s[key]));
  const n=signals.length;
  return {
    observations:n,
    recognition:avg('recognition'),
    conversational_ease:avg('ease'),
    revealed_attraction:avg('attraction'),
    emotional_safety:avg('safety'),
    intellectual_stimulation:avg('intellectual'),
    experienced_values_fit:avg('values'),
    continuation_intent:avg('continuation'),
    confidence:clamp01(n/5),
    epistemic_note:n<2?'Insufficient repeated dyadic evidence for a stable conclusion.':'Repeated interaction evidence is available but remains context-bound.'
  };
}

module.exports={DIMENSIONS,buildMatchPrior,outcomeSignal,summarizeDyadicEvidence};
