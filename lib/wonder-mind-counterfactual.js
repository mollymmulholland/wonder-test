'use strict';

const {planExecutiveInformationPolicy}=require('./wonder-mind-executive-policy');

const MAX_OPTIONS=6;
const ACTION_ARCHETYPES={
  reach_out:{patterns:[/reach out/,/text/,/message/,/call/,/initiat/],information_gain:.76,reversibility:.82,autonomy:.92,pressure:.34,downside:.30,time_sensitivity:.58,description:'Create a small, direct opportunity for new evidence.'},
  wait:{patterns:[/wait/,/do nothing/,/hold off/,/give .* space/],information_gain:.34,reversibility:.96,autonomy:.94,pressure:.08,downside:.22,time_sensitivity:.42,description:'Preserve optionality and allow behavior to emerge without additional pressure.'},
  another_date:{patterns:[/another date/,/second date/,/see .* again/,/meet again/],information_gain:.91,reversibility:.74,autonomy:.88,pressure:.28,downside:.34,time_sensitivity:.62,description:'Acquire direct dyadic evidence through another interaction.'},
  end_connection:{patterns:[/end/,/stop seeing/,/walk away/,/close .* door/,/cut .* off/],information_gain:.10,reversibility:.24,autonomy:.96,pressure:.04,downside:.48,time_sensitivity:.30,description:'Reduce ongoing uncertainty by exiting the connection.'},
  relax_filter:{patterns:[/relax .* filter/,/broaden/,/change .* preference/,/widen/],information_gain:.78,reversibility:.94,autonomy:.96,pressure:.04,downside:.16,time_sensitivity:.22,description:'Run a broader search experiment without declaring prior preferences false.'},
  withhold_match:{patterns:[/withhold/,/do not show/,/no match/,/skip .* match/],information_gain:.18,reversibility:.88,autonomy:.90,pressure:.04,downside:.20,time_sensitivity:.18,description:'Avoid manufacturing confidence in a weak or poorly supported match.'},
  ask_directly:{patterns:[/ask .* directly/,/clarify/,/have .* conversation/],information_gain:.82,reversibility:.78,autonomy:.90,pressure:.40,downside:.32,time_sensitivity:.56,description:'Seek explicit interpersonal evidence while preserving the other person’s freedom to answer.'}
};

function clamp(v,lo=0,hi=1){v=Number(v);return Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):lo;}
function mean(xs=[]){return xs.length?xs.reduce((a,b)=>a+Number(b||0),0)/xs.length:0;}
function detectArchetype(label=''){
  const text=String(label).toLowerCase();
  for(const [key,spec] of Object.entries(ACTION_ARCHETYPES))if(spec.patterns.some(re=>re.test(text)))return {key,...spec};
  return {key:'custom',information_gain:.48,reversibility:.68,autonomy:.88,pressure:.22,downside:.30,time_sensitivity:.40,description:'A user-defined course of action requiring bounded, non-causal comparison.'};
}
function normalizeOptions(options=[]){
  return (Array.isArray(options)?options:[]).slice(0,MAX_OPTIONS).map((o,i)=>{
    if(typeof o==='string')return {id:`option_${i+1}`,label:o};
    return {id:String(o?.id||`option_${i+1}`).slice(0,80),label:String(o?.label||o?.action||'').slice(0,500),notes:String(o?.notes||'').slice(0,1200)};
  }).filter(o=>o.label.trim());
}
function defaultOptions(runType='relationship'){
  if(runType==='match')return ['Show the match now','Withhold the match until evidence improves','Broaden the candidate set'];
  if(runType==='post_date')return ['Go on another date','Ask directly about what feels unclear','Wait and observe what happens next','End the connection'];
  return ['Reach out directly','Wait and observe','Ask directly for clarification','Step away from the connection'];
}
function evidenceState(context={},dyadContext=null){
  const memory=context.memory||[], outcomes=context.recentOutcomes||[], dyad=dyadContext?.outcomeHistory||[], corrections=context.mirrorCorrections||[];
  const independence=mean(memory.map(m=>Math.min(1,(m.independent_source_count||0)/2)));
  const contamination=mean(memory.map(m=>m.contamination_score||0));
  const observational=Math.min(1,(outcomes.length+dyad.length)/4);
  const correction=Math.min(1,corrections.length/3);
  const adequacy=clamp(.34*independence+.34*observational+.18*correction+.14*(1-contamination));
  return {adequacy,independence,contamination,observational,correction};
}
function scoreBranch(option,{context={},dyadContext=null,runType='relationship',userValues={}}={}){
  const archetype=detectArchetype(option.label), evidence=evidenceState(context,dyadContext);
  const highUncertainty=1-evidence.adequacy;
  const learningValue=clamp(archetype.information_gain*(.55+.45*highUncertainty));
  const reversibility=archetype.reversibility;
  const autonomy=archetype.autonomy;
  const pressureCost=archetype.pressure;
  const downside=archetype.downside;
  const timing=archetype.time_sensitivity;
  const valueAlignment=clamp(userValues.autonomy==null?.82:(.58*autonomy+.42*clamp(userValues.autonomy)));
  const expectedUtility=clamp(.27*learningValue+.19*reversibility+.20*autonomy+.14*valueAlignment+.08*timing+.12*(1-downside)-.10*pressureCost);
  const uncertainty=clamp(.24+.52*highUncertainty+.12*pressureCost+.12*(1-reversibility));
  const confidence=clamp(.72-.42*uncertainty+.16*evidence.observational);
  return {
    option_id:option.id,label:option.label,notes:option.notes||'',archetype:archetype.key,
    heuristic_utility:expectedUtility,comparison_confidence:confidence,
    dimensions:{learning_value:learningValue,reversibility,autonomy,value_alignment:valueAlignment,interpersonal_pressure:pressureCost,downside_risk:downside,time_sensitivity:timing},
    plausible_upside:plausibleUpside(archetype.key),plausible_downside:plausibleDownside(archetype.key),
    evidence_needed:neededEvidence(archetype.key,runType),
    description:archetype.description,
    causal_status:'decision_heuristic_not_causal_prediction'
  };
}
function plausibleUpside(key){
  const m={reach_out:'May create clear behavioral evidence while preserving optionality.',wait:'May reveal spontaneous reciprocity without adding pressure.',another_date:'May resolve uncertainty that profiles and messages cannot resolve.',end_connection:'May protect time, attention, and boundaries when continued ambiguity has low value.',relax_filter:'May reveal attraction or compatibility outside stated ideals.',withhold_match:'May prevent false precision and preserve trust in Wonder recommendations.',ask_directly:'May replace speculation with explicit interpersonal information.',custom:'May clarify tradeoffs when compared against the same decision criteria.'};
  return m[key]||m.custom;
}
function plausibleDownside(key){
  const m={reach_out:'May expose the user to rejection or create pressure if repeated after weak reciprocity.',wait:'May preserve ambiguity or allow a time-sensitive opportunity to pass.',another_date:'Requires additional time and emotional investment before uncertainty resolves.',end_connection:'May close an option before enough evidence exists and is less reversible than observation.',relax_filter:'May increase search breadth without improving outcomes if constraints were genuinely important.',withhold_match:'May create false negatives if Wonder is excessively conservative.',ask_directly:'May produce socially filtered answers and can feel pressuring if timing is poor.',custom:'Consequences remain uncertain and should not be treated as causally established.'};
  return m[key]||m.custom;
}
function neededEvidence(key,runType){
  if(key==='another_date')return ['observed dyadic ease','felt recognition','revealed attraction','desire to continue'];
  if(key==='reach_out'||key==='ask_directly')return ['reciprocity','clarity of response','consistency between words and behavior'];
  if(key==='wait')return ['spontaneous initiation','behavior over time','change in ambiguity without prompting'];
  if(key==='relax_filter')return ['revealed attraction across broader candidates','post-date outcomes','preference-outcome divergence'];
  if(key==='withhold_match')return ['additional feasibility or values evidence','candidate pool alternatives','later outcome calibration'];
  if(key==='end_connection')return ['cost of continued ambiguity','boundary violations or incompatibilities','evidence that more observation has low information value'];
  return runType==='match'?['match-relevant outcomes','independent compatibility evidence']:['observable behavioral evidence','user-reported outcome'];
}
function compareCounterfactuals({runType='relationship',message='',options=[],context={},dyadContext=null,recentQuestions=[],candidateUserId=null,userValues={}}={}){
  const normalized=normalizeOptions(options.length?options:defaultOptions(runType));
  const executive=planExecutiveInformationPolicy({runType,message,purposes:[],context,dyadContext,recentQuestions,candidateUserId});
  const branches=normalized.map(o=>scoreBranch(o,{context,dyadContext,runType,userValues})).sort((a,b)=>b.heuristic_utility-a.heuristic_utility);
  const gap=branches.length>1?branches[0].heuristic_utility-branches[1].heuristic_utility:0;
  const recommendationConfidence=clamp((branches[0]?.comparison_confidence||.4)*(.55+.45*Math.min(1,gap/.18)));
  const recommend=branches[0]&&recommendationConfidence>=.52?branches[0].option_id:null;
  return {
    run_type:runType,recommended_option_id:recommend,recommendation_confidence:recommendationConfidence,
    executive_action:executive.action,executive_reason:executive.reason,
    branches,
    caveat:'These are structured decision scenarios, not causal forecasts. Wonder compares tradeoffs and information value; it does not know what would have happened under an unchosen action.',
    policy_version:'wonder-counterfactual-decision-policy-v1'
  };
}

module.exports={ACTION_ARCHETYPES,normalizeOptions,defaultOptions,evidenceState,scoreBranch,compareCounterfactuals};
