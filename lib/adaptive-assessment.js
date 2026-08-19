const {ITEMS,ARCHETYPES,scoreResponses,inferArchetypes}=require('./person-model');

const CORE_IDS=[
 'cog_complexity','cog_uncertainty','ambiguity_scale','novelty_weekend','social_room','emotion_scale','structure_scale',
 'identity_feedback','identity_compliment','competence_scale','values_rank','values_loss','values_money','betrayal',
 'rel_distance','rel_closeness','rel_autonomy','rel_reassurance','rel_vulnerability','rel_conflict','reciprocity_scale','trust_scale',
 'stress_failure','shadow_need'
];
const MATCH_CRITICAL=new Set(['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_loyalty','autonomy_need','closeness_need','reassurance_need','vulnerability_openness','conflict_directness','repair_orientation','reciprocity_sensitivity','trust_baseline']);

function itemDimensions(item){const out=new Set();if(item.scale)Object.keys(item.scale).forEach(k=>out.add(k));for(const o of item.options||[]){Object.keys(o.w||{}).forEach(k=>out.add(k));if(o.dimension)out.add(o.dimension)}return[...out];}
function tensionSignals(model){
 const d=model.dimensions||{},e=model.evidence||{},out=[];
 const add=(a,b,label,threshold=.22)=>{if((e[a]||0)<1||(e[b]||0)<1)return;const av=d[a]||0,bv=d[b]||0;if(av>=threshold&&bv>=threshold)out.push({dims:[a,b],label,severity:Math.min(av,bv)});};
 add('autonomy_need','reassurance_need','independence + reassurance');
 add('closeness_need','stress_withdrawal','closeness + withdrawal');
 add('competence_identity','stress_control','competence + control');
 add('value_freedom','value_stability','freedom + stability');
 add('conflict_directness','reassurance_need','directness + reassurance');
 add('closeness_need','autonomy_need','closeness + autonomy',.3);
 return out.sort((a,b)=>b.severity-a.severity);
}
function archetypeDiscriminators(model){
 const ranked=inferArchetypes(model),a=ranked[0],b=ranked[1];if(!a||!b)return{ranked,gap:0,dims:new Set()};
 const pa=ARCHETYPES[a.name]?.prototype||{},pb=ARCHETYPES[b.name]?.prototype||{},dims=new Set();
 for(const k of new Set([...Object.keys(pa),...Object.keys(pb)])){if(Math.abs((pa[k]||0)-(pb[k]||0))>=.22)dims.add(k);}
 return{ranked,gap:Math.max(0,(a.score||0)-(b.score||0)),dims};
}
function selectionState(responses={}){
 const answered=new Set(Object.keys(responses)),model=scoreResponses(responses),tensions=tensionSignals(model),tensionDims=new Set(tensions.flatMap(t=>t.dims)),archetype=archetypeDiscriminators(model);
 const order=Object.keys(responses),lastSections=order.slice(-2).map(id=>ITEMS.find(x=>x.id===id)?.section).filter(Boolean);
 return{answered,model,tensions,tensionDims,archetype,lastSections};
}
function scoreCandidate(item,state){
 const dims=itemDimensions(item);let score=0;
 for(const d of dims){
   const ev=state.model.evidence[d]||0,target=MATCH_CRITICAL.has(d)?2:1.25;
   score+=Math.max(0,target-ev)*(MATCH_CRITICAL.has(d)?.9:.55);
   if(state.tensionDims.has(d))score+=1.05;
   if(state.archetype.dims.has(d))score+=.55;
 }
 const answeredInSection=ITEMS.filter(x=>x.section===item.section&&state.answered.has(x.id)).length;
 score+=Math.max(0,.5-answeredInSection*.06);
 if(state.lastSections.length===2&&state.lastSections.every(s=>s===item.section))score-=1.1;
 if(item.type==='scale')score+=.08; // useful calibration after contextual choices
 return score;
}
function nextItem(responses={}){
 const state=selectionState(responses),count=state.answered.size;
 for(const id of CORE_IDS){if(!state.answered.has(id))return{item:ITEMS.find(x=>x.id===id),phase:'core',count,target_min:28,target_max:36,coverage:state.model.coverage,archetype_gap:state.archetype.gap,tensions:state.tensions.map(t=>t.label)}}

 const candidates=ITEMS.filter(x=>!state.answered.has(x.id)).sort((a,b)=>scoreCandidate(b,state)-scoreCandidate(a,state));
 const critical=[...MATCH_CRITICAL].map(k=>state.model.evidence[k]||0),weakCritical=critical.filter(x=>x<1.5).length;
 const severeTensions=state.tensions.filter(t=>t.severity>=.35).length;
 const sufficientlySeparated=state.archetype.gap>=.035;
 const ready=count>=28&&weakCritical<=4&&severeTensions<=1&&sufficientlySeparated;
 const mature=count>=32&&weakCritical<=6&&severeTensions<=2;
 const shouldStop=ready||mature||count>=36;
 if(shouldStop||!candidates.length)return{complete:true,phase:'complete',count,target_min:28,target_max:36,coverage:state.model.coverage,archetype_gap:state.archetype.gap,tensions:state.tensions.map(t=>t.label)};

 const phase=state.tensions.length||!sufficientlySeparated?'precision':'coverage';
 return{item:candidates[0],phase,count,target_min:28,target_max:36,coverage:state.model.coverage,archetype_gap:state.archetype.gap,tensions:state.tensions.map(t=>t.label)};
}
module.exports={CORE_IDS,itemDimensions,tensionSignals,archetypeDiscriminators,nextItem};