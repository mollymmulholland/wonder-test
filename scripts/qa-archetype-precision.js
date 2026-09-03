const assert=require('assert');
const {PRECISION_ITEMS,PRECISION_IDS,scoreResponses}=require('../lib/archetype-precision');
const {nextItem,TARGET_MIN,TARGET_MAX,PRECISION_MIN}=require('../lib/adaptive-assessment');
const {inferArchetypes}=require('../lib/archetype-system-v2');
assert.equal(PRECISION_ITEMS.length,10);assert.equal(new Set(PRECISION_IDS).size,10);assert(TARGET_MIN>=35+PRECISION_MIN);assert(TARGET_MAX<=45);
for(const item of PRECISION_ITEMS){assert(item.element);assert(item.options.length>=4);for(const o of item.options)assert(Object.keys(o.w||{}).length>0);}
const neutral={};const model=scoreResponses(neutral);assert(model.dimensions&&model.evidence);assert.equal(inferArchetypes(model).length,20);
// With only the 35 core IDs represented, the journey must not complete: it must enter precision.
const core={};const {CORE_IDS}=require('../lib/adaptive-assessment');for(const id of CORE_IDS)core[id]=3;const afterCore=nextItem(core);assert(!afterCore.complete);assert.equal(afterCore.phase,'precision');assert(afterCore.item&&PRECISION_IDS.includes(afterCore.item.id));
// Six precision answers are the minimum; a close archetype race may adaptively request more, capped at 45.
for(const id of PRECISION_IDS.slice(0,PRECISION_MIN))core[id]=0;const afterMin=nextItem(core);assert(afterMin.complete||afterMin.phase==='precision');assert((afterMin.target_max||TARGET_MAX)===TARGET_MAX);
console.log(JSON.stringify({ok:true,precision_items:PRECISION_ITEMS.length,target_min:TARGET_MIN,target_max:TARGET_MAX,precision_min:PRECISION_MIN,next_after_core:afterCore.item.id},null,2));