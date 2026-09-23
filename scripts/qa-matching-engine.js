const assert=require('assert');
const {compatibility,archetypeCompatibility}=require('../lib/matching-engine');

const profile={gender:'Woman',interested_in:'Everyone',relationship_structure:'Monogamy',relationship_intention:'Long-term relationship',children:'Unsure'};
const P=(d,patterns=[],archetypes=[])=>({profile,model:{dimensions:d,coverage:.9,mirror_basis:{cross_element_patterns:patterns},archetypes}});

// Archetype fit must be the dominant component when archetype evidence exists.
{
 const a=P({value_meaning:.5,repair_orientation:.5},[],[{name:'Architect',score:.82},{name:'Seer',score:.71}]);
 const b=P({value_meaning:.5,repair_orientation:.5},[],[{name:'Architect',score:.8},{name:'Guardian',score:.67}]);
 const r=compatibility(a,b);
 assert(r.components.archetype_fit!=null,'archetype fit should be present');
 assert(r.components.archetype_detail?.a?.length&&r.components.archetype_detail?.b?.length,'archetype blends should be retained');
}

// Primary + secondary blends should produce a deterministic archetype compatibility score.
{
 const a={archetypes:[{name:'Explorer',score:.86},{name:'Maverick',score:.68}]};
 const b={archetypes:[{name:'Seer',score:.81},{name:'Alchemist',score:.7}]};
 const first=archetypeCompatibility(a,b),second=archetypeCompatibility(a,b);
 assert.equal(first.score,second.score,'archetype fit must be deterministic');
 assert(first.available===true,'known archetypes should create an available archetype pairing');
}

// High reassurance paired with withdrawal should still be penalized as a viability safeguard.
{
 const archetypes=[{name:'Devotee',score:.82},{name:'Guardian',score:.7}];
 const a=P({reassurance_need:.75,closeness_need:.65,autonomy_need:.25,repair_orientation:.4,stress_withdrawal:.05,value_meaning:.6,value_family:.5},[],archetypes);
 const withdrawing=P({reassurance_need:.1,closeness_need:.1,autonomy_need:.7,repair_orientation:.05,stress_withdrawal:.8,value_meaning:.6,value_family:.5},[],archetypes);
 const repairing=P({reassurance_need:.25,closeness_need:.55,autonomy_need:.35,repair_orientation:.75,stress_withdrawal:-.2,value_meaning:.6,value_family:.5},[],archetypes);
 assert(compatibility(a,repairing).score>compatibility(a,withdrawing).score,'repair must still validate archetypal fit');
}

// Closeness + autonomy is a legitimate combined need; a balanced partner should support it.
{
 const archetypes=[{name:'Sovereign',score:.8},{name:'Devotee',score:.69}];
 const a=P({closeness_need:.7,autonomy_need:.7,reassurance_need:.25,repair_orientation:.55,value_freedom:.6,value_family:.5},[{key:'closeness_autonomy'}],archetypes);
 const balanced=P({closeness_need:.62,autonomy_need:.62,reassurance_need:.2,repair_orientation:.6,stress_withdrawal:.05,value_freedom:.55,value_family:.5},[],archetypes);
 const engulfing=P({closeness_need:.85,autonomy_need:-.6,reassurance_need:.65,repair_orientation:.35,stress_withdrawal:.05,value_freedom:-.35,value_family:.5},[],archetypes);
 assert(compatibility(a,balanced).score>compatibility(a,engulfing).score,'balanced fit should beat engulfing fit within the same archetypal pairing');
}

// Hard life constraints remain gates regardless of archetypal chemistry.
{
 const arch=[{name:'Alchemist',score:.9},{name:'Seer',score:.72}];
 const a=P({value_meaning:.8},[],arch);a.profile={...profile,children:'Want children'};
 const b=P({value_meaning:.8},[],arch);b.profile={...profile,children:'Do not want children'};
 assert.equal(compatibility(a,b).eligible,false);
}

console.log('Wonder matching QA: archetype-primary deterministic checks passed.');