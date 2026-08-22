const assert=require('assert');
const {compatibility}=require('../lib/matching-engine');

const profile={gender:'Woman',interested_in:'Everyone',relationship_structure:'Monogamy',relationship_intention:'Long-term relationship',children:'Unsure'};
const P=(d,patterns=[])=>({profile,model:{dimensions:d,coverage:.9,mirror_basis:{cross_element_patterns:patterns}}});

// High reassurance paired with withdrawal should score worse than reassurance paired with repair.
{
 const a=P({reassurance_need:.75,closeness_need:.65,autonomy_need:.25,repair_orientation:.4,stress_withdrawal:.05,value_meaning:.6,value_family:.5});
 const withdrawing=P({reassurance_need:.1,closeness_need:.1,autonomy_need:.7,repair_orientation:.05,stress_withdrawal:.8,value_meaning:.6,value_family:.5});
 const repairing=P({reassurance_need:.25,closeness_need:.55,autonomy_need:.35,repair_orientation:.75,stress_withdrawal:-.2,value_meaning:.6,value_family:.5});
 assert(compatibility(a,repairing).score>compatibility(a,withdrawing).score,'repairing partner should support reassurance better than withdrawing partner');
}

// Closeness + autonomy is a legitimate combined need; a balanced partner should support it.
{
 const a=P({closeness_need:.7,autonomy_need:.7,reassurance_need:.25,repair_orientation:.55,value_freedom:.6,value_family:.5},[{key:'closeness_autonomy'}]);
 const balanced=P({closeness_need:.62,autonomy_need:.62,reassurance_need:.2,repair_orientation:.6,stress_withdrawal:.05,value_freedom:.55,value_family:.5});
 const engulfing=P({closeness_need:.85,autonomy_need:-.6,reassurance_need:.65,repair_orientation:.35,stress_withdrawal:.05,value_freedom:-.35,value_family:.5});
 assert(compatibility(a,balanced).score>compatibility(a,engulfing).score,'balanced closeness/autonomy should beat engulfing fit');
}

// Productive complementarity should not reward extreme mismatch.
{
 const a=P({social_initiation:.35,cognitive_systemizing:.45,cognitive_contextual:.15,emotional_intensity:.3,structure_preference:.2,value_meaning:.5});
 const moderate=P({social_initiation:.05,cognitive_systemizing:.15,cognitive_contextual:.45,emotional_intensity:.28,structure_preference:.15,value_meaning:.5});
 const extreme=P({social_initiation:-.95,cognitive_systemizing:-.95,cognitive_contextual:.95,emotional_intensity:-.9,structure_preference:-.9,value_meaning:.5});
 assert(compatibility(a,moderate).components.complementarity>compatibility(a,extreme).components.complementarity,'moderate complementarity should beat extreme mismatch');
}

// Hard life constraints remain gates regardless of psychometric fit.
{
 const a=P({value_meaning:.8});a.profile={...profile,children:'Want children'};
 const b=P({value_meaning:.8});b.profile={...profile,children:'Do not want children'};
 assert.equal(compatibility(a,b).eligible,false);
}

console.log('Wonder matching QA: all deterministic checks passed.');