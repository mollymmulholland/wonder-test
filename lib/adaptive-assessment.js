const {ITEMS,ARCHETYPES,scoreResponses,inferArchetypes}=require('./person-model');

// Wonder's assessment is experienced as five psychological environments.
// The element is presentation + sequencing metadata; scoring still comes from the
// underlying item weights in person-model so this does not change the psychometric model.
const ELEMENTS=['Earth','Water','Fire','Air','Ether'];
const ELEMENT_IDS={
 Earth:['structure_scale','family_scale','values_rank','values_loss','values_beauty','stress_chaos','stress_failure'],
 Water:['emotion_scale','rel_distance','rel_closeness','rel_reassurance','rel_vulnerability','reciprocity_scale','trust_scale'],
 Fire:['novelty_weekend','novelty_scale','achievement_scale','rel_conflict','direct_scale','identity_compliment','values_money'],
 Air:['cog_complexity','cog_uncertainty','cog_disagreement','cog_explanation','ambiguity_scale','decisive_scale','social_room'],
 Ether:['identity_feedback','identity_criticism','distinct_scale','belong_scale','competence_scale','meaning_scale','values_loyalty']
};
const CORE_IDS=ELEMENTS.flatMap(e=>ELEMENT_IDS[e]);
const MATCH_CRITICAL=new Set(['value_family','value_achievement','value_meaning','value_freedom','value_stability','value_loyalty','autonomy_need','closeness_need','reassurance_need','vulnerability_openness','conflict_directness','repair_orientation','reciprocity_sensitivity','trust_baseline']);

function elementForItem(item){
 if(!item)return'Ether';
 for(const e of ELEMENTS)if(ELEMENT_IDS[e].includes(item.id))return e;
 const s=item.section||'';
 if(s==='Relationships')return'Water';
 if(s==='Instinct')return'Air';
 if(s==='Under pressure')return'Fire';
 if(s==='Values')return'Ether';
 if(s==='Self')return'Ether';
 return'Earth';
}
function itemDimensions(item){const out=new Set();if(item.scale)Object.keys(item.scale).forEach(k=>out.add(k));for(const o of item.options||[]){Object.keys(o.w||{}).forEach(k=>out.add(k));if(o.dimension)out.add(o.dimension)}return[...out];}
function tensionSignals(model){
 const d=model.dimensions||{},e=model.evidence||{},out=[];
 const add=(a,b,label,threshold=.22)=>{if((e[a]||0)<1||(e[b]||0)<1)return;const av=d[a]||0,bv=d[b]||0;if(av>=threshold&&bv>=threshold)out.push({dims:[a,b],label,severity:Math.min(av,bv)});};
 add('autonomy_need','reassurance_need','independence + reassurance');add('closeness_need','stress_withdrawal','closeness + withdrawal');add('competence_identity','stress_control','competence + control');add('value_freedom','value_stability','freedom + stability');add('conflict_directness','reassurance_need','directness + reassurance');add('closeness_need','autonomy_need','closeness + autonomy',.3);
 return out.sort((a,b)=>b.severity-a.severity);
}
function archetypeDiscriminators(model){const ranked=inferArchetypes(model),a=ranked[0],b=ranked[1];if(!a||!b)return{ranked,gap:0,dims:new Set()};const pa=ARCHETYPES[a.name]?.prototype||{},pb=ARCHETYPES[b.name]?.prototype||{},dims=new Set();for(const k of new Set([...Object.keys(pa),...Object.keys(pb)])){if(Math.abs((pa[k]||0)-(pb[k]||0))>=.22)dims.add(k);}return{ranked,gap:Math.max(0,(a.score||0)-(b.score||0)),dims};}
function selectionState(responses={}){const answered=new Set(Object.keys(responses)),model=scoreResponses(responses),tensions=tensionSignals(model),tensionDims=new Set(tensions.flatMap(t=>t.dims)),archetype=archetypeDiscriminators(model);return{answered,model,tensions,tensionDims,archetype};}
function scoreCandidate(item,state){const dims=itemDimensions(item);let score=0;if(!dims.length)return-10;for(const d of dims){const ev=state.model.evidence[d]||0,target=MATCH_CRITICAL.has(d)?2:1.25;score+=Math.max(0,target-ev)*(MATCH_CRITICAL.has(d)?.9:.55);if(state.tensionDims.has(d))score+=1.05;if(state.archetype.dims.has(d))score+=.55;}if(item.type==='scale')score+=.08;return score;}
function elementMeta(element,index,count){return{element,element_index:index+1,element_count:5,element_progress:`${index+1}/5`,count,target_min:35,target_max:36};}
function nextItem(responses={}){
 const state=selectionState(responses),count=state.answered.size;
 // Finish one environment before crossing its threshold. This makes the journey
 // legible: Earth → Water → Fire → Air → Ether, rather than a shuffled survey.
 for(let ei=0;ei<ELEMENTS.length;ei++){
   const element=ELEMENTS[ei],ids=ELEMENT_IDS[element];
   const unanswered=ids.filter(id=>!state.answered.has(id));
   if(unanswered.length){const item=ITEMS.find(x=>x.id===unanswered[0]);if(item)return{item,phase:'element',...elementMeta(element,ei,count),coverage:state.model.coverage,tensions:state.tensions.map(t=>t.label)};}
 }
 // One final adaptive precision probe is allowed, but it remains inside the element
 // it psychologically belongs to rather than becoming a sixth questionnaire phase.
 if(count<36){const candidates=ITEMS.filter(x=>!state.answered.has(x.id)&&itemDimensions(x).length).sort((a,b)=>scoreCandidate(b,state)-scoreCandidate(a,state));if(candidates.length){const item=candidates[0],element=elementForItem(item),ei=ELEMENTS.indexOf(element);return{item,phase:'precision',...elementMeta(element,Math.max(0,ei),count),coverage:state.model.coverage,tensions:state.tensions.map(t=>t.label)};}}
 return{complete:true,phase:'complete',count,target_min:35,target_max:36,coverage:state.model.coverage,tensions:state.tensions.map(t=>t.label)};
}
module.exports={CORE_IDS,ELEMENTS,ELEMENT_IDS,elementForItem,itemDimensions,tensionSignals,archetypeDiscriminators,nextItem};