// Wonder Relational System v1.0
// Evaluates whether two psychological architectures can form a viable relationship system.
// Archetypes remain the interpretive language; architecture provides the relational mechanics.

const VERSION='wonder-relational-system-v1.0';
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const avg=xs=>{const v=xs.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:.5};
const sim=(a=0,b=0)=>clamp(1-Math.min(2,Math.abs(Number(a)-Number(b)))/2);
const layer=(m,name)=>m?.psychological_architecture?.architecture?.[name]||m?.architecture?.[name]||null;
const dims=m=>m?.dimensions||m?.scores||{};

function layerSimilarity(a,b,name){const A=layer(a,name),B=layer(b,name);if(!A||!B)return .5;if(A.primary===B.primary)return .88;if(A.secondary===B.primary||B.secondary===A.primary)return .72;return clamp(.62-Math.abs(Number(A.score||0)-Number(B.score||0))*.18);}
function valuesFit(a,b){const A=dims(a),B=dims(b),keys=['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_loyalty','value_service','value_influence'];return avg(keys.map(k=>sim(A[k],B[k])));}
function attachmentFit(a,b){const A=dims(a),B=dims(b);let score=avg([sim(A.closeness_need,B.closeness_need),sim(A.autonomy_need,B.autonomy_need),sim(A.vulnerability_openness,B.vulnerability_openness),sim(A.trust_baseline,B.trust_baseline)]);let risk=0;if((A.reassurance_need||0)>.45&&(B.stress_withdrawal||0)>.4)risk+=.18;if((B.reassurance_need||0)>.45&&(A.stress_withdrawal||0)>.4)risk+=.18;if((A.closeness_need||0)>.65&&(B.autonomy_need||0)>.72&&(B.repair_orientation||0)<.2)risk+=.09;if((B.closeness_need||0)>.65&&(A.autonomy_need||0)>.72&&(A.repair_orientation||0)<.2)risk+=.09;return clamp(score-risk);}
function regulationFit(a,b){const A=dims(a),B=dims(b);let score=avg([sim(A.repair_orientation,B.repair_orientation),sim(A.conflict_directness,B.conflict_directness),sim(A.stress_withdrawal,B.stress_withdrawal),sim(A.stress_control,B.stress_control)]),risk=0;if((A.stress_control||0)>.55&&(B.autonomy_need||0)>.65)risk+=.09;if((B.stress_control||0)>.55&&(A.autonomy_need||0)>.65)risk+=.09;if((A.emotional_intensity||0)>.65&&(B.emotional_intensity||0)>.65&&avg([A.repair_orientation||0,B.repair_orientation||0])<.3)risk+=.12;return clamp(score-risk);}
function autonomyClosenessFit(a,b){const A=dims(a),B=dims(b);const oneWay=(self,other)=>{const closeNeed=Math.max(0,self.closeness_need||0),autoNeed=Math.max(0,self.autonomy_need||0);const closeSupport=closeNeed>.15?clamp(.68+(other.closeness_need||0)*.2+(other.repair_orientation||0)*.16-Math.max(0,other.stress_withdrawal||0)*.28):.75;const autoSupport=autoNeed>.15?clamp(.7+(other.autonomy_need||0)*.18+(other.trust_baseline||0)*.12-Math.max(0,other.stress_control||0)*.24):.75;return avg([closeSupport,autoSupport]);};return avg([oneWay(A,B),oneWay(B,A)]);}
function motiveFit(a,b){return avg([layerSimilarity(a,b,'dominant_motive'),layerSimilarity(a,b,'meaning_orientation'),valuesFit(a,b)]);}
function cognitionFit(a,b){return avg([layerSimilarity(a,b,'cognitive_orientation'),sim(dims(a).ambiguity_tolerance,dims(b).ambiguity_tolerance),sim(dims(a).cognitive_contextual,dims(b).cognitive_contextual)]);}
function socialFit(a,b){return avg([layerSimilarity(a,b,'social_orientation'),sim(dims(a).social_initiation,dims(b).social_initiation),sim(dims(a).belonging_need,dims(b).belonging_need)]);}
function shadowFit(a,b){const A=layer(a,'shadow_response'),B=layer(b,'shadow_response'),ad=dims(a),bd=dims(b);let risk=0;if(A?.primary==='control'&&B?.primary==='distance')risk+=.12;if(B?.primary==='control'&&A?.primary==='distance')risk+=.12;if(A?.primary==='fusion'&&B?.primary==='distance')risk+=.16;if(B?.primary==='fusion'&&A?.primary==='distance')risk+=.16;if(A?.primary==='escalation'&&B?.primary==='escalation')risk+=.12;if(A?.primary==='vigilance'&&(bd.stress_withdrawal||0)>.4)risk+=.08;if(B?.primary==='vigilance'&&(ad.stress_withdrawal||0)>.4)risk+=.08;const repair=avg([ad.repair_orientation||0,bd.repair_orientation||0]);return clamp(.78-risk+Math.max(0,repair)*.14);}
function developmentalExpansion(a,b){const A=dims(a),B=dims(b);const bounded=(x,y,ideal=.25)=>{const d=Math.abs((x||0)-(y||0));if(d>.95)return .35;return clamp(1-Math.abs(d-ideal)*1.2);};return avg([bounded(A.novelty_orientation,B.novelty_orientation,.22),bounded(A.autonomy_need,B.autonomy_need,.2),bounded(A.cognitive_systemizing,B.cognitive_systemizing,.22),bounded(A.cognitive_contextual,B.cognitive_contextual,.18)]);}

function relationalSystem(a,b){
 const components={
  attachment:attachmentFit(a,b),
  autonomy_closeness:autonomyClosenessFit(a,b),
  regulation_repair:regulationFit(a,b),
  motives_values:motiveFit(a,b),
  cognition:cognitionFit(a,b),
  social:socialFit(a,b),
  shadow:shadowFit(a,b),
  expansion:developmentalExpansion(a,b)
 };
 const score=clamp(components.attachment*.2+components.autonomy_closeness*.16+components.regulation_repair*.18+components.motives_values*.18+components.cognition*.08+components.social*.05+components.shadow*.1+components.expansion*.05);
 const risks=[];if(components.attachment<.5)risks.push('attachment_support');if(components.autonomy_closeness<.5)risks.push('closeness_autonomy');if(components.regulation_repair<.48)risks.push('repair_cycle');if(components.shadow<.5)risks.push('shadow_collision');if(components.motives_values<.52)risks.push('life_direction');
 return{version:VERSION,score,components,risks,viable:score>=.58&&components.attachment>=.44&&components.regulation_repair>=.42&&components.motives_values>=.46};
}
module.exports={VERSION,relationalSystem};
