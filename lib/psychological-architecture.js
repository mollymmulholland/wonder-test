// Wonder Psychological Architecture v1.0
// Infers role-specific psychological organization before archetype interpretation.
// Archetypes describe expressions of architecture; they are not diagnoses or fixed identities.

const VERSION='wonder-psychological-architecture-v1.0';
const clamp=(n,min=-1,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const avg=(...xs)=>{const v=xs.flat().filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0};
const pos=n=>(clamp(n)+1)/2;
const inv=n=>-clamp(n);
const top=(obj={})=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([name,score])=>({name,score}));

function inferPsychologicalArchitecture(model={}){
 const d=model.dimensions||model.scores||{};
 const g=k=>clamp(d[k]);

 const motiveScores={
  intimacy:avg(g('closeness_need'),g('vulnerability_openness'),g('reciprocity_sensitivity'),g('value_loyalty')),
  autonomy:avg(g('autonomy_need'),g('value_freedom'),g('distinctiveness_need')),
  mastery:avg(g('competence_identity'),g('value_achievement'),g('structure_preference'),g('decisiveness')),
  influence:avg(g('value_influence'),g('recognition_need'),g('decisiveness'),g('conflict_directness')),
  discovery:avg(g('novelty_orientation'),g('value_knowledge'),g('ambiguity_tolerance'),g('cognitive_contextual')),
  security:avg(g('value_stability'),g('value_family'),g('structure_preference'),g('trust_baseline')),
  meaning:avg(g('value_meaning'),g('value_service'),g('cognitive_contextual')),
  beauty:avg(g('value_beauty'),g('emotional_intensity'),g('distinctiveness_need')),
  belonging:avg(g('belonging_need'),g('value_family'),g('closeness_need'))
 };

 const regulationScores={
  mobilize:avg(g('stress_control'),g('decisiveness'),g('conflict_directness')),
  withdraw:avg(g('stress_withdrawal'),g('autonomy_need'),inv(g('social_initiation'))*.35),
  accommodate:avg(g('stress_accommodation'),g('repair_orientation'),g('belonging_need')),
  intellectualize:avg(g('stress_intellectualization'),g('cognitive_systemizing'),inv(g('emotional_intensity'))*.25),
  intensify:avg(g('emotional_intensity'),g('reassurance_need'),g('reciprocity_sensitivity'))
 };

 const cognitionScores={
  systemizing:avg(g('cognitive_systemizing'),g('structure_preference'),g('competence_identity')),
  contextual:avg(g('cognitive_contextual'),g('ambiguity_tolerance'),g('value_meaning')),
  exploratory:avg(g('novelty_orientation'),g('ambiguity_tolerance'),g('value_knowledge')),
  decisive:avg(g('decisiveness'),g('stress_control'),g('cognitive_systemizing')*.35),
  intuitive:avg(g('cognitive_contextual'),g('value_meaning'),g('value_beauty'),g('ambiguity_tolerance')*.35)
 };

 const socialScores={
  initiate:avg(g('social_initiation'),g('recognition_need')*.3,g('belonging_need')*.25),
  observe_then_select:avg(g('cognitive_contextual'),g('distinctiveness_need'),inv(g('social_initiation'))*.25),
  deepen:avg(g('closeness_need'),g('vulnerability_openness'),g('value_loyalty')),
  harmonize:avg(g('repair_orientation'),g('stress_accommodation'),g('belonging_need')),
  influence:avg(g('value_influence'),g('social_initiation'),g('decisiveness'))
 };

 const intimacyScores={
  interdependent:avg(g('closeness_need'),g('vulnerability_openness'),g('trust_baseline'),g('repair_orientation')),
  autonomy_preserving:avg(g('autonomy_need'),g('value_freedom'),g('vulnerability_openness')*.15),
  reciprocity_monitoring:avg(g('reciprocity_sensitivity'),g('reassurance_need'),inv(g('trust_baseline'))*.25),
  guarded:avg(g('stress_withdrawal'),inv(g('vulnerability_openness')),inv(g('trust_baseline'))),
  secure_exploratory:avg(g('trust_baseline'),g('autonomy_need'),g('closeness_need'),g('novelty_orientation')*.25)
 };

 const agencyScores={
  direct:avg(g('decisiveness'),g('conflict_directness'),g('value_influence')),
  architect:avg(g('cognitive_systemizing'),g('structure_preference'),g('competence_identity')),
  adaptive:avg(g('ambiguity_tolerance'),g('cognitive_contextual'),g('repair_orientation')),
  independent:avg(g('autonomy_need'),g('value_freedom'),g('distinctiveness_need')),
  service_led:avg(g('value_service'),g('repair_orientation'),g('stress_accommodation'))
 };

 const meaningScores={
  transcendence:avg(g('value_meaning'),g('cognitive_contextual'),g('ambiguity_tolerance')),
  contribution:avg(g('value_service'),g('value_influence'),g('value_meaning')),
  creation:avg(g('value_beauty'),g('value_achievement'),g('distinctiveness_need')),
  knowledge:avg(g('value_knowledge'),g('cognitive_systemizing'),g('cognitive_contextual')),
  belonging:avg(g('value_family'),g('belonging_need'),g('closeness_need')),
  freedom:avg(g('value_freedom'),g('autonomy_need'),g('novelty_orientation'))
 };

 const shadowScores={
  control:avg(g('stress_control'),g('structure_preference'),g('decisiveness'),g('competence_identity')),
  distance:avg(g('stress_withdrawal'),g('autonomy_need'),inv(g('vulnerability_openness'))),
  fusion:avg(g('closeness_need'),g('reassurance_need'),g('reciprocity_sensitivity'),inv(g('autonomy_need'))*.35),
  vigilance:avg(g('reciprocity_sensitivity'),g('reassurance_need'),inv(g('trust_baseline'))),
  appeasement:avg(g('stress_accommodation'),g('repair_orientation'),inv(g('conflict_directness'))),
  abstraction:avg(g('stress_intellectualization'),g('cognitive_contextual'),g('value_meaning'),inv(g('emotional_intensity'))*.15),
  escalation:avg(g('emotional_intensity'),g('conflict_directness'),g('novelty_orientation')*.25)
 };

 const layer=(scores)=>{const ranked=top(scores),first=ranked[0]||{name:null,score:0},second=ranked[1]||{name:null,score:0};return{primary:first.name,secondary:second.name,score:first.score,gap:first.score-second.score,ranked};};
 const architecture={
  dominant_motive:layer(motiveScores),
  regulatory_style:layer(regulationScores),
  cognitive_orientation:layer(cognitionScores),
  social_orientation:layer(socialScores),
  intimacy_strategy:layer(intimacyScores),
  agency_orientation:layer(agencyScores),
  meaning_orientation:layer(meaningScores),
  shadow_response:layer(shadowScores)
 };
 const confidence=Object.values(architecture).reduce((s,x)=>s+pos(x.gap*2),0)/Object.keys(architecture).length;
 return{version:VERSION,architecture,confidence};
}

module.exports={VERSION,inferPsychologicalArchitecture};
