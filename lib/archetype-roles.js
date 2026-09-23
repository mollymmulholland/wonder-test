// Wonder Archetype Roles v1.0
// Maps psychological architecture to role-specific archetypal expressions.

const VERSION='wonder-archetype-roles-v1.0';

const ROLE_MAP={
 world:{
  exploratory:'Explorer',contextual:'Seer',systemizing:'Architect',decisive:'Strategist',intuitive:'Visionary',
  discovery:'Explorer',meaning:'Visionary',mastery:'Architect',influence:'Sovereign',beauty:'Artisan',autonomy:'Maverick'
 },
 attachment:{
  interdependent:'Devotee',secure_exploratory:'Guardian',autonomy_preserving:'Maverick',reciprocity_monitoring:'Sentinel',guarded:'Sentinel',
  intimacy:'Devotee',belonging:'Connector',security:'Guardian'
 },
 agency:{direct:'Sovereign',architect:'Architect',adaptive:'Strategist',independent:'Maverick',service_led:'Steward'},
 perception:{systemizing:'Scholar',contextual:'Seer',exploratory:'Explorer',decisive:'Strategist',intuitive:'Seer'},
 meaning:{transcendence:'Pilgrim',contribution:'Steward',creation:'Artisan',knowledge:'Scholar',belonging:'Idealist',freedom:'Explorer'},
 social:{initiate:'Connector',observe_then_select:'Seer',deepen:'Devotee',harmonize:'Diplomat',influence:'Catalyst'},
 shadow:{control:'Sovereign',distance:'Maverick',fusion:'Devotee',vigilance:'Sentinel',appeasement:'Diplomat',abstraction:'Seer',escalation:'Catalyst'}
};

function role(name,source,value,architecture){
 const archetype=ROLE_MAP[name]?.[value]||null;
 const layer=architecture?.[source];
 return{role:name,archetype,expression:value,confidence:layer?Math.max(0,Math.min(1,.5+Number(layer.gap||0))):.5};
}

function inferArchetypeRoles(psych={}){
 const a=psych.architecture||{};
 const roles=[
  role('world','cognitive_orientation',a.cognitive_orientation?.primary,a),
  role('attachment','intimacy_strategy',a.intimacy_strategy?.primary,a),
  role('agency','agency_orientation',a.agency_orientation?.primary,a),
  role('perception','cognitive_orientation',a.cognitive_orientation?.primary,a),
  role('meaning','meaning_orientation',a.meaning_orientation?.primary,a),
  role('social','social_orientation',a.social_orientation?.primary,a),
  role('shadow','shadow_response',a.shadow_response?.primary,a)
 ];
 return{version:VERSION,roles,by_role:Object.fromEntries(roles.map(x=>[x.role,x]))};
}

module.exports={VERSION,ROLE_MAP,inferArchetypeRoles};
