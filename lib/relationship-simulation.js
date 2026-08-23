// Wonder Relationship Simulation v1.0
// Models plausible relationship dynamics from measured architecture.
// This is a hypothesis engine, not a deterministic prediction of two people.
const VERSION='wonder-relationship-simulation-v1.0';
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
const avg=xs=>{const v=xs.filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:.5};
const dims=m=>m?.dimensions||m?.scores||{};
const layer=(m,name)=>m?.psychological_architecture?.architecture?.[name]||m?.architecture?.[name]||null;
function stage(score,label,body,risk=null){return{score:clamp(score),label,body,risk};}
function simulateRelationship(a,b,context={}){
 const A=dims(a),B=dims(b);const system=context.system||{};const arch=context.arch||{};const C=system.components||{};
 const recognition=Number(arch.functions?.recognition??.5),expansion=Number(arch.functions?.expansion??C.expansion??.5),attachment=Number(C.attachment??.5),repair=Number(C.regulation_repair??.5),shadow=Number(C.shadow??.5),life=Number(C.motives_values??.5),social=Number(C.social??.5),autonomy=Number(C.autonomy_closeness??.5);
 const intensity=avg([Math.max(0,A.emotional_intensity||0),Math.max(0,B.emotional_intensity||0)]),novelty=avg([Math.max(0,A.novelty_orientation||0),Math.max(0,B.novelty_orientation||0)]),trust=avg([Math.max(0,A.trust_baseline||0),Math.max(0,B.trust_baseline||0)]);
 const early=clamp(recognition*.38+expansion*.24+social*.12+novelty*.12+intensity*.08+life*.06);
 const intimacy=clamp(attachment*.38+autonomy*.2+trust*.14+repair*.12+recognition*.1+life*.06);
 const conflict=clamp(repair*.34+shadow*.28+autonomy*.14+attachment*.1+life*.08+social*.06);
 const longTerm=clamp(life*.3+attachment*.2+repair*.2+autonomy*.14+shadow*.1+recognition*.06);
 const growth=clamp(expansion*.3+shadow*.2+repair*.18+autonomy*.14+recognition*.1+life*.08);
 const volatility=clamp((1-repair)*.28+(1-shadow)*.25+intensity*.18+Math.max(0,A.reassurance_need||0)*Math.max(0,B.stress_withdrawal||0)*.15+Math.max(0,B.reassurance_need||0)*Math.max(0,A.stress_withdrawal||0)*.15);
 const pursuitDistance=((A.reassurance_need||0)>.4&&(B.stress_withdrawal||0)>.35)||((B.reassurance_need||0)>.4&&(A.stress_withdrawal||0)>.35);
 const controlAutonomy=((A.stress_control||0)>.45&&(B.autonomy_need||0)>.55)||((B.stress_control||0)>.45&&(A.autonomy_need||0)>.55);
 const highChemLowSafety=early>.72&&(repair<.5||shadow<.5);
 const stages={
  early_attraction:stage(early,'Early attraction',early>.72?'Recognition and difference may create immediate psychological interest.':early>.58?'There is enough recognition to create curiosity, though the connection may build rather than announce itself.':'The pairing may require more real-world context before attraction becomes legible.'),
  intimacy_formation:stage(intimacy,'Intimacy formation',intimacy>.7?'Trust and closeness appear capable of deepening without requiring either person to disappear.':intimacy>.55?'Intimacy looks possible, but it will depend on making needs and boundaries unusually legible.':'The current model sees friction in how closeness is likely to be built.'),
  conflict_cycle:stage(conflict,'Conflict cycle',conflict>.7?'When tension appears, the pair has a credible path back toward contact and mutual understanding.':conflict>.52?'Conflict is workable, but default stress responses may occasionally misread one another.':'The likely stress cycle could make each person less regulated before repair begins.',pursuitDistance?'pursuit_distance':controlAutonomy?'control_autonomy':null),
  long_term_coherence:stage(longTerm,'Long-term coherence',longTerm>.72?'The relationship appears capable of supporting compatible lives, not only compatible moments.':longTerm>.56?'There is plausible life coherence, but some priorities would need explicit negotiation.':'The psychological connection may be stronger than the evidence that the same life can hold both people.'),
  developmental_upside:stage(growth,'Developmental upside',growth>.72?'This pairing may help both people become more flexible without requiring either to become less themselves.':growth>.56?'There is useful difference here, provided it remains supportable rather than corrective.':'Difference currently looks more likely to create strain than development.')
 };
 const warnings=[];if(pursuitDistance)warnings.push({id:'pursuit_distance',text:'One person’s attempt to restore connection may intensify the other person’s attempt to create space.'});if(controlAutonomy)warnings.push({id:'control_autonomy',text:'Under stress, one person may seek certainty in ways the other experiences as pressure or loss of authorship.'});if(highChemLowSafety)warnings.push({id:'chemistry_safety_gap',text:'The early pull may be stronger than the current evidence for repair and emotional safety.'});if(volatility>.62)warnings.push({id:'volatility',text:'Intensity could rise faster than clarity when the bond feels uncertain.'});
 const upside=[];if(attachment>.72&&autonomy>.7)upside.push('Closeness may become possible without possession.');if(repair>.72)upside.push('The pair has unusually good evidence for returning to one another after rupture.');if(expansion>.72&&shadow>.62)upside.push('Difference may create discovery without consistently activating defensive patterns.');if(life>.75)upside.push('The relationship appears more capable than average of fitting the lives both people actually want.');
 const overall=clamp(early*.14+intimacy*.22+conflict*.22+longTerm*.26+growth*.16-volatility*.08);
 const confidence=clamp(avg([Number(context.confidence??.5),Number(a?.confidence?.coverage??a?.coverage??.5),Number(b?.confidence?.coverage??b?.coverage??.5)]));
 return{version:VERSION,overall,confidence,stages,warnings,upside,volatility,principle:'This is a relationship hypothesis generated from current evidence. Real interaction can confirm, complicate, or overturn it.'};
}
module.exports={VERSION,simulateRelationship};