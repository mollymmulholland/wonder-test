// Lightweight deterministic QA harness for Wonder Person Model.
// Run locally with: node scripts/qa-person-model.js
const assert=require('assert');
const {ITEMS,scoreResponses,inferArchetypes}=require('../lib/person-model');
const {nextItem}=require('../lib/adaptive-assessment');

const byId=Object.fromEntries(ITEMS.map(x=>[x.id,x]));
function scale(res,id,n){res[id]=n;}
function pick(res,id,labelPart){const item=byId[id];const i=item.options.findIndex(o=>o.label.toLowerCase().includes(labelPart.toLowerCase()));if(i<0)throw new Error(`No option ${labelPart} for ${id}`);res[id]=i;}
function rank(res,labels){const item=byId.values_rank;res.values_rank=labels.map(label=>item.options.findIndex(o=>o.label===label));}
function multi(res,id,labels){const item=byId[id];res[id]=labels.map(label=>item.options.findIndex(o=>o.label===label));}
function completeCore(res){for(const id of require('../lib/adaptive-assessment').CORE_IDS){if(res[id]!==undefined)continue;const item=byId[id];if(item.type==='scale')res[id]=4;else if(item.type==='multi')res[id]=[0];else if(item.type==='rank')res[id]=[0,1,2,3,4];else res[id]=0;}return res;}
function report(name,res){const model=scoreResponses(res),archetypes=inferArchetypes(model);return{name,model,archetypes,next:nextItem(res)};}

// Regression: betrayal by deception must not imply low baseline trust.
{
 const r={};pick(r,'betrayal','deliberately deceived');
 const m=scoreResponses(r);assert.equal(m.evidence.trust_baseline,0);assert.equal(m.dimensions.trust_baseline,0);
}
// Regression: a feared shadow possibility is not direct trait evidence.
{
 const r={};pick(r,'shadow_possibility','admiration');
 const m=scoreResponses(r);assert.equal(m.evidence.recognition_need,0);
}
// High autonomy + freedom should prefer Maverick over Devotee.
{
 const r={};scale(r,'rel_autonomy',7);scale(r,'rel_closeness',2);scale(r,'novelty_scale',6);scale(r,'distinct_scale',7);rank(r,['Freedom','Adventure','Knowledge','Achievement','Meaning']);pick(r,'rel_model','independent lives');
 const out=report('autonomous explorer',r);assert(out.archetypes.findIndex(a=>a.name==='Maverick')<out.archetypes.findIndex(a=>a.name==='Devotee'));
}
// High closeness/family/loyalty should prefer Devotee over Maverick.
{
 const r={};scale(r,'rel_autonomy',2);scale(r,'rel_closeness',7);scale(r,'family_scale',7);scale(r,'reciprocity_scale',7);rank(r,['Deep love','Family','Loyalty','Meaning','Stability']);pick(r,'rel_model','intertwined');
 const out=report('relational devotee',r);assert(out.archetypes.findIndex(a=>a.name==='Devotee')<out.archetypes.findIndex(a=>a.name==='Maverick'));
}
// Core completion should either stop responsibly or request an unanswered precision item.
{
 const r=completeCore({});const n=nextItem(r);assert(n.complete||(!Object.prototype.hasOwnProperty.call(r,n.item.id)));
}

console.log('Wonder QA: all deterministic checks passed.');
for(const sample of [
 report('neutral core',completeCore({})),
])console.log(sample.name,{top:sample.archetypes.slice(0,3).map(a=>[a.name,Number(a.score.toFixed(3))]),coverage:Number(sample.model.coverage.toFixed(3)),next:sample.next.complete?'complete':sample.next.item.id,phase:sample.next.phase});