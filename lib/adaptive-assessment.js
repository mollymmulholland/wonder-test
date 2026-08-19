const {ITEMS,scoreResponses}=require('./person-model');

const CORE_IDS=[
 'cog_complexity','cog_uncertainty','ambiguity_scale','novelty_weekend','social_room','emotion_scale','structure_scale',
 'identity_feedback','identity_compliment','competence_scale','values_rank','values_loss','values_money','betrayal',
 'rel_distance','rel_closeness','rel_autonomy','rel_reassurance','rel_vulnerability','rel_conflict','reciprocity_scale','trust_scale',
 'stress_failure','shadow_need'
];
const MATCH_CRITICAL=new Set(['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_loyalty','autonomy_need','closeness_need','reassurance_need','vulnerability_openness','conflict_directness','repair_orientation','reciprocity_sensitivity','trust_baseline']);

function itemDimensions(item){
 const out=new Set();
 if(item.scale)Object.keys(item.scale).forEach(k=>out.add(k));
 for(const o of item.options||[]){Object.keys(o.w||{}).forEach(k=>out.add(k));if(o.dimension)out.add(o.dimension)}
 return [...out];
}
function tensions(d){
 const t=[];
 const high=(k,n=.35)=>(d[k]||0)>=n;
 if(high('autonomy_need')&&high('reassurance_need'))t.push(['autonomy_need','reassurance_need']);
 if(high('closeness_need')&&high('stress_withdrawal'))t.push(['closeness_need','stress_withdrawal']);
 if(high('competence_identity')&&high('stress_control'))t.push(['competence_identity','stress_control']);
 if(high('vulnerability_openness')&&high('stress_withdrawal'))t.push(['vulnerability_openness','stress_withdrawal']);
 if(high('value_freedom')&&high('value_stability'))t.push(['value_freedom','value_stability']);
 if(high('conflict_directness')&&high('reassurance_need'))t.push(['conflict_directness','reassurance_need']);
 return t;
}
function selectionState(responses={}){
 const answered=new Set(Object.keys(responses));
 const model=scoreResponses(responses);
 const tensionDims=new Set(tensions(model.dimensions).flat());
 return{answered,model,tensionDims};
}
function scoreCandidate(item,state){
 const dims=itemDimensions(item);let score=0;
 for(const d of dims){
   const ev=state.model.evidence[d]||0;
   score+=1/(1+ev);
   if(MATCH_CRITICAL.has(d))score+=.35;
   if(state.tensionDims.has(d))score+=.8;
 }
 // Favor underrepresented sections slightly so the experience stays psychologically broad.
 const sectionCount=ITEMS.filter(x=>x.section===item.section&&state.answered.has(x.id)).length;
 score+=Math.max(0,.6-sectionCount*.08);
 return score;
}
function nextItem(responses={}){
 const state=selectionState(responses);
 const count=state.answered.size;
 for(const id of CORE_IDS){if(!state.answered.has(id))return{item:ITEMS.find(x=>x.id===id),phase:'core',count,target_min:28,target_max:36,model:state.model,tensions:[...state.tensionDims]}}
 const candidates=ITEMS.filter(x=>!state.answered.has(x.id)).sort((a,b)=>scoreCandidate(b,state)-scoreCandidate(a,state));
 const criticalEvidence=[...MATCH_CRITICAL].map(k=>state.model.evidence[k]||0);
 const weakCritical=criticalEvidence.filter(x=>x<1).length;
 const shouldStop=count>=28 && weakCritical<=3 && state.tensionDims.size<=2;
 if(shouldStop||count>=36||!candidates.length)return{complete:true,phase:'complete',count,target_min:28,target_max:36,model:state.model,tensions:[...state.tensionDims]};
 return{item:candidates[0],phase:state.tensionDims.size?'precision':'coverage',count,target_min:28,target_max:36,model:state.model,tensions:[...state.tensionDims]};
}
module.exports={CORE_IDS,itemDimensions,tensions,nextItem};