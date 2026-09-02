'use strict';

const crypto=require('crypto');
const {REGION_SLUGS,clamp}=require('./wonder-mind-schema');

const GEOMETRY_VERSION='wonder-cognitive-geometry-v1';
const SPACE_VERSIONS={
  cognitive_process:'wonder-space/cognitive-process@1',
  human_state:'wonder-space/human-state@1',
  dyadic_field:'wonder-space/dyadic-field@1'
};

// These bases are navigational views of a larger state, never claims that a person has three dimensions.
const PROJECTIONS={
  human_state:{
    id:'wonder-projection/human-state@1',
    labels:['autonomy_to_affiliation','containment_to_activation','structure_to_emergence'],
    basis:[
      {autonomy_need:-.9,distinctiveness_need:-.55,belonging_need:.6,closeness_need:.8,recognition_need:.65},
      {stress_accommodation:-.55,repair_orientation:-.45,emotional_intensity:.75,reassurance_need:.6,stress_control:.45},
      {structure_preference:-.8,cognitive_systemizing:-.45,ambiguity_tolerance:.65,novelty_orientation:.75,vulnerability_openness:.45}
    ],
    epistemic_note:'A partial projection of assessment-supported constructs. Axes are navigational tensions, not diagnoses or fixed traits.'
  },
  cognitive_process:{
    id:'wonder-projection/cognitive-process@1',
    labels:['interiority_to_relation','memory_to_possibility','exploration_to_governance'],
    basis:[
      {'self-identity':-.9,'values-meaning':-.55,'narrative-symbolic':-.45,'recognition-empathy':.55,'motive-reciprocity':.65,'dyadics-relationship':1},
      {'temporal-memory':-.9,'culture-context':-.35,'development-becoming':.8,'future-domain-adapter':1},
      {'attraction-desire':-.4,'narrative-symbolic':-.25,'learning-calibration':.45,'epistemic-immune':.75,'ethics-consent-safety':.85,'meta-cognitive-executive':1}
    ],
    epistemic_note:'A reversible engineering projection of cognitive activation. It is not a psychological ontology.'
  },
  dyadic_field:{
    id:'wonder-projection/dyadic-field@1',
    labels:['feasibility_to_recognition','activation_to_safety','friction_to_development'],
    basis:[
      {life_feasibility:-.55,experienced_values_fit:.45,recognition:.9,reciprocity:.65},
      {revealed_attraction:-.75,attachment_activation:-.55,emotional_safety:.85,repair_capacity:.55},
      {friction:-.8,shadow_activation:-.55,growth_compatibility:.65,developmental_momentum:.85}
    ],
    epistemic_note:'A partial view of observed and unknown dyadic conditions. Missing evidence remains visible as missing coverage.'
  }
};

function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.keys(value).sort().reduce((o,k)=>(o[k]=stable(value[k]),o),{});
  return value;
}
function canonical(value){return JSON.stringify(stable(value));}
function hash(value){return crypto.createHash('sha256').update(canonical(value)).digest('hex');}
function unique(xs=[]){return [...new Set(xs.map(String).filter(Boolean))];}
function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null;}

function normalizeDimension(raw={}){
  const value=numberOrNull(raw.value);
  const confidence=value==null?0:clamp(raw.confidence,0,1,0);
  return {
    value:value==null?null:Math.max(-1,Math.min(1,value)),
    confidence,
    uncertainty:Number((1-confidence).toFixed(4)),
    evidence_refs:unique(raw.evidence_refs).slice(0,24),
    basis:String(raw.basis||'unknown').slice(0,120),
    observed_at:raw.observed_at||null
  };
}

function createState({spaceVersion,entityType='cognitive_process',observedAt=new Date().toISOString(),dimensions={},evidenceRefs=[],provenance={}}={}){
  if(!spaceVersion)throw new Error('spaceVersion is required');
  const normalized=Object.fromEntries(Object.entries(dimensions).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,normalizeDimension(value)]));
  const state={geometry_version:GEOMETRY_VERSION,space_version:spaceVersion,entity_type:entityType,observed_at:observedAt,dimensions:normalized,evidence_refs:unique(evidenceRefs).slice(0,80),provenance};
  return {...state,state_hash:hash(state)};
}

function projectAxis(dimensions,basis){
  let numerator=0,observedWeight=0,totalWeight=0,uncertaintyWeight=0;
  for(const [key,weight] of Object.entries(basis)){
    const abs=Math.abs(weight);totalWeight+=abs;
    const d=dimensions[key];
    if(!d||d.value==null)continue;
    const reliability=clamp(d.confidence,0,1,0);
    numerator+=d.value*weight*reliability;
    observedWeight+=abs*reliability;
    uncertaintyWeight+=abs*(1-reliability);
  }
  return {
    value:observedWeight?Number(Math.max(-1,Math.min(1,numerator/observedWeight)).toFixed(5)):null,
    coverage:totalWeight?Number((observedWeight/totalWeight).toFixed(5)):0,
    uncertainty:totalWeight?Number(Math.min(1,1-(observedWeight-uncertaintyWeight*.25)/totalWeight).toFixed(5)):1
  };
}

function projectState(state,projection){
  if(!state?.dimensions||!projection?.basis||projection.basis.length!==3)throw new Error('A state and three-axis projection are required');
  const axes=projection.basis.map(b=>projectAxis(state.dimensions,b));
  const result={projection_id:projection.id,labels:projection.labels,coordinates:axes.map(a=>a.value),axes,source_state_hash:state.state_hash,epistemic_note:projection.epistemic_note};
  return {...result,projection_hash:hash(result)};
}

function deriveCognitiveProcessState({routing=[],evidenceProfile={},observedAt,runType='chat',evidenceRefs=[]}={}){
  const bySlug=Object.fromEntries((routing||[]).map(r=>[r.slug,r]));
  const dimensions={};
  for(const slug of REGION_SLUGS){
    const r=bySlug[slug];
    dimensions[slug]={value:r?clamp(r.score,0,1,0):null,confidence:r?1:0,evidence_refs:evidenceRefs,basis:r?'deterministic_router_activation':'not_activated',observed_at:observedAt};
  }
  dimensions['evidence-independence']={value:clamp((evidenceProfile.independentSourceCount||0)/4,0,1,0),confidence:clamp(evidenceProfile.confidenceCeiling,0,1,0),evidence_refs:evidenceRefs,basis:'admissible_evidence_ledger',observed_at:observedAt};
  return createState({spaceVersion:SPACE_VERSIONS.cognitive_process,entityType:'cognitive_process',observedAt,dimensions,evidenceRefs,provenance:{run_type:runType,router:'wonder-mind-router-v1',geometry_role:'observability_not_personhood'}});
}

function deriveHumanState({personModel,observedAt,evidenceRefs=[]}={}){
  if(!personModel?.scores||typeof personModel.scores!=='object')return null;
  const confidence=clamp(personModel.confidence?.architecture_confidence,0,1,.45)*clamp(personModel.confidence?.coverage,0,1,.65);
  const dimensions={};
  for(const [key,raw] of Object.entries(personModel.scores)){
    const value=numberOrNull(raw);
    dimensions[key]={value:value==null?null:(clamp(value,0,1,.5)*2)-1,confidence,evidence_refs:evidenceRefs,basis:'person_model_snapshot',observed_at:observedAt||personModel.created_at};
  }
  return createState({spaceVersion:SPACE_VERSIONS.human_state,entityType:'human_state',observedAt:observedAt||personModel.created_at,dimensions,evidenceRefs,provenance:{person_model_snapshot_id:personModel.id||null,model_version:personModel.model_version||null,geometry_role:'partial_model_not_personhood'}});
}

function deriveDyadicFieldState({dyadicEvidence={},priorDimensions={},observedAt,evidenceRefs=[]}={}){
  const map={recognition:'recognition',revealed_attraction:'revealed_attraction',emotional_safety:'emotional_safety',experienced_values_fit:'experienced_values_fit',continuation_intent:'developmental_momentum'};
  const dimensions={};
  for(const [source,target] of Object.entries(map)){
    const value=numberOrNull(dyadicEvidence[source]);
    dimensions[target]={value:value==null?null:(value*2)-1,confidence:value==null?0:clamp(dyadicEvidence.confidence,0,1,0),evidence_refs:evidenceRefs,basis:'observed_dyadic_outcomes',observed_at:observedAt};
  }
  for(const [key,value] of Object.entries(priorDimensions||{}))if(!dimensions[key])dimensions[key]={value:numberOrNull(value)==null?null:(Number(value)*2)-1,confidence:.35,evidence_refs:evidenceRefs,basis:'static_match_prior',observed_at:observedAt};
  return createState({spaceVersion:SPACE_VERSIONS.dyadic_field,entityType:'dyadic_field',observedAt,dimensions,evidenceRefs,provenance:{causal_status:'descriptive_state_not_causal_prediction'}});
}

function buildTrajectory(snapshots=[],projection=PROJECTIONS.cognitive_process){
  const ordered=[...snapshots].filter(Boolean).sort((a,b)=>new Date(a.observed_at)-new Date(b.observed_at));
  const points=ordered.map(s=>({observed_at:s.observed_at,state_hash:s.state_hash,projection:projectState(s,projection)}));
  const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dt=Math.max(1,new Date(b.observed_at)-new Date(a.observed_at));
    segments.push({from:a.state_hash,to:b.state_hash,duration_ms:dt,velocity:b.projection.coordinates.map((v,j)=>v==null||a.projection.coordinates[j]==null?null:Number(((v-a.projection.coordinates[j])/(dt/86400000)).toFixed(6)))});
  }
  const trajectory={geometry_version:GEOMETRY_VERSION,projection_id:projection.id,points,segments,causal_status:'observed_path_not_forecast',epistemic_note:'Movement may reflect new evidence, context, model revision, or real change. Geometry alone cannot distinguish them.'};
  return {...trajectory,trajectory_hash:hash(trajectory)};
}

function branchScenarios({origin,branches=[],projection=PROJECTIONS.dyadic_field}={}){
  if(!origin)throw new Error('origin state is required');
  const originPoint=projectState(origin,projection);
  return branches.slice(0,8).map(branch=>{
    const terminal=createState({spaceVersion:origin.space_version,entityType:origin.entity_type,observedAt:branch.horizon||origin.observed_at,dimensions:{...origin.dimensions,...(branch.dimensions||{})},evidenceRefs:branch.evidence_refs||origin.evidence_refs,provenance:{scenario_id:branch.id,causal_status:'plausible_branch_not_prediction'}});
    return {id:String(branch.id),label:String(branch.label||branch.id),probability:numberOrNull(branch.probability),origin:originPoint,terminal:projectState(terminal,projection),evidence_needed:unique(branch.evidence_needed),causal_status:'plausible_branch_not_prediction'};
  });
}

module.exports={GEOMETRY_VERSION,SPACE_VERSIONS,PROJECTIONS,canonical,hash,normalizeDimension,createState,projectState,deriveCognitiveProcessState,deriveHumanState,deriveDyadicFieldState,buildTrajectory,branchScenarios};
