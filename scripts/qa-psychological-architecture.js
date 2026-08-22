const assert=require('assert');
const {inferPsychologicalArchitecture}=require('../lib/psychological-architecture');
const {inferArchetypeRoles}=require('../lib/archetype-roles');

const model={dimensions:{
 cognitive_contextual:.85,ambiguity_tolerance:.75,value_meaning:.9,value_knowledge:.55,novelty_orientation:.5,
 closeness_need:.8,vulnerability_openness:.7,reciprocity_sensitivity:.65,value_loyalty:.75,trust_baseline:.45,
 autonomy_need:.35,value_freedom:.45,distinctiveness_need:.5,decisiveness:.7,value_influence:.65,
 competence_identity:.7,structure_preference:.4,conflict_directness:.35,repair_orientation:.6,
 stress_control:.45,stress_withdrawal:.1,stress_accommodation:.25,stress_intellectualization:.35,
 emotional_intensity:.7,value_service:.35,value_beauty:.55,value_achievement:.6,value_stability:.25,
 value_family:.5,belonging_need:.35,social_initiation:.2,recognition_need:.3
}};
const psych=inferPsychologicalArchitecture(model);
assert(psych.architecture.dominant_motive.primary,'dominant motive required');
assert(psych.architecture.cognitive_orientation.primary,'cognitive orientation required');
assert(psych.architecture.intimacy_strategy.primary,'intimacy strategy required');
assert(psych.architecture.shadow_response.primary,'shadow response required');
assert(Object.keys(psych.architecture).length===8,'eight architecture layers required');
const roles=inferArchetypeRoles(psych);
assert(roles.roles.length===7,'seven role expressions required');
assert(roles.by_role.attachment.archetype,'attachment archetype required');
assert(roles.by_role.agency.archetype,'agency archetype required');
assert(roles.by_role.shadow.archetype,'shadow archetype required');
console.log(JSON.stringify({ok:true,architecture:Object.fromEntries(Object.entries(psych.architecture).map(([k,v])=>[k,v.primary])),roles:Object.fromEntries(roles.roles.map(r=>[r.role,r.archetype]))},null,2));
