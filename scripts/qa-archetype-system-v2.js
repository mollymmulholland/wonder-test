const assert=require('assert');
const {ARCHETYPES,deriveFoundations,inferArchetypes,blend}=require('../lib/archetype-system-v2');
const {archetypePair}=require('../lib/matching-engine-v4');

assert(Object.keys(ARCHETYPES).length>=20,'Wonder should have at least 20 archetypes in v2');

function model(dimensions,archetypes){return{dimensions,coverage:.9,archetypes:archetypes||[]};}

// Distinct foundational profiles should not collapse to the same archetype.
{
 const structured=model({cognitive_systemizing:.9,structure_preference:.85,competence_identity:.8,decisiveness:.65,value_stability:.6});
 const exploratory=model({novelty_orientation:.9,value_freedom:.9,ambiguity_tolerance:.75,autonomy_need:.65,structure_preference:-.7});
 const relational=model({closeness_need:.9,value_loyalty:.85,reciprocity_sensitivity:.8,repair_orientation:.75,value_family:.7});
 const a=inferArchetypes(structured)[0].name,b=inferArchetypes(exploratory)[0].name,c=inferArchetypes(relational)[0].name;
 assert(new Set([a,b,c]).size===3,`archetype collapse: ${a}, ${b}, ${c}`);
}

// Foundations should preserve continuous information instead of assigning MBTI/PI labels.
{
 const f=deriveFoundations(model({social_initiation:.7,novelty_orientation:.6,structure_preference:-.4,autonomy_need:.6}).dimensions?model({social_initiation:.7,novelty_orientation:.6,structure_preference:-.4,autonomy_need:.6}):{});
 assert(Number.isFinite(f.big5.openness));assert(Number.isFinite(f.jung.perceiving));assert(Number.isFinite(f.behavior.agency));assert(Number.isFinite(f.motives.autonomy));
}

// Primary + secondary should form a real blend.
{
 const b=blend([{name:'Visionary',score:.82},{name:'Devotee',score:.78}]);
 assert.equal(b.types.length,2);assert(b.types[0].weight>.5&&b.types[0].weight<.85);assert(Object.keys(b.vector).length>5);
}

// Same primary archetype can produce different pairing structures through secondary type.
{
 const x=model({},[{name:'Visionary',score:.84},{name:'Devotee',score:.79}]);
 const y=model({},[{name:'Visionary',score:.84},{name:'Maverick',score:.79}]);
 const guardian=model({},[{name:'Guardian',score:.84},{name:'Steward',score:.76}]);
 const p1=archetypePair(x,guardian),p2=archetypePair(y,guardian);
 assert.notEqual(Number(p1.score.toFixed(4)),Number(p2.score.toFixed(4)),'secondary archetype should materially affect compatibility');
}

console.log('Wonder expanded archetype QA: deterministic checks passed.');
