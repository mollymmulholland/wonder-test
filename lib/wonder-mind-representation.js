'use strict';

const {rest}=require('./supabase-server');
const {deriveCognitiveProcessState,deriveHumanState,deriveDyadicFieldState,projectState,buildTrajectory,PROJECTIONS}=require('./wonder-mind-geometry');
const {compileJudgment,encode,GLYPH_LANGUAGE_VERSION}=require('./wonder-mind-glyphs');
const {summarizeDyadicEvidence}=require('./wonder-mind-match');

async function insertSnapshot({runId,userId,candidateUserId=null,state,projection,output}){
  const rows=await rest('/wonder_mind_state_snapshots?select=id,observed_at,state_hash,space_version,entity_type,dimensions,projection',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,candidate_user_id:candidateUserId,run_id:runId,entity_type:state.entity_type,space_version:state.space_version,state_hash:state.state_hash,dimensions:state.dimensions,projection,evidence_refs:state.evidence_refs,epistemic_class:output.epistemic_class,confidence:output.confidence,observed_at:state.observed_at,provenance:state.provenance}});
  return rows[0];
}

async function persistTrajectory({runId,userId,candidateUserId=null,state,projectionDefinition,output}){
  const candidateFilter=candidateUserId?`&candidate_user_id=eq.${encodeURIComponent(candidateUserId)}`:'&candidate_user_id=is.null';
  const previous=await rest(`/wonder_mind_state_snapshots?user_id=eq.${encodeURIComponent(userId)}${candidateFilter}&entity_type=eq.${encodeURIComponent(state.entity_type)}&order=observed_at.desc&limit=11&select=id,observed_at,state_hash,space_version,entity_type,dimensions,projection,evidence_refs,provenance`,{admin:true});
  const states=previous.map(s=>({geometry_version:'wonder-cognitive-geometry-v1',space_version:s.space_version,entity_type:s.entity_type,observed_at:s.observed_at,dimensions:s.dimensions,evidence_refs:s.evidence_refs,provenance:s.provenance,state_hash:s.state_hash}));
  const trajectory=buildTrajectory(states,projectionDefinition);
  if(trajectory.points.length<2)return null;
  const rows=await rest('/wonder_mind_trajectories?select=id',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,candidate_user_id:candidateUserId,run_id:runId,entity_type:state.entity_type,projection_id:trajectory.projection_id,trajectory_hash:trajectory.trajectory_hash,points:trajectory.points,segments:trajectory.segments,coverage:trajectory.points.at(-1)?.projection?.axes?.reduce((a,x)=>a+x.coverage,0)/3||0,confidence:output.confidence,causal_status:trajectory.causal_status,epistemic_note:trajectory.epistemic_note}});
  return rows[0]?.id||null;
}

async function persistRunRepresentations({runId,userId,candidateUserId=null,judgmentId,runType,routing,evidenceProfile,evidenceRefs,output,ethicsClear,context={},dyadContext=null,observedAt=new Date().toISOString()}={}){
  const state=deriveCognitiveProcessState({routing,evidenceProfile,observedAt,runType,evidenceRefs});
  const projection=projectState(state,PROJECTIONS.cognitive_process);
  const snapshot=await insertSnapshot({runId,userId,state,projection,output});
  const trajectoryId=await persistTrajectory({runId,userId,state,projectionDefinition:PROJECTIONS.cognitive_process,output});
  let human=null;
  const personModel=context.personModels?.[0];
  const humanEvidence=personModel?.id?evidenceRefs.filter(ref=>ref===`assessment:${personModel.id}`):[];
  const humanState=deriveHumanState({personModel,evidenceRefs:humanEvidence});
  if(humanState){
    const existing=await rest(`/wonder_mind_state_snapshots?user_id=eq.${encodeURIComponent(userId)}&entity_type=eq.human_state&state_hash=eq.${humanState.state_hash}&select=id&limit=1`,{admin:true});
    if(existing[0])human={snapshotId:existing[0].id,unchanged:true,stateHash:humanState.state_hash};
    else{
      const humanProjection=projectState(humanState,PROJECTIONS.human_state);
      const humanSnapshot=await insertSnapshot({runId,userId,state:humanState,projection:humanProjection,output});
      const humanTrajectoryId=await persistTrajectory({runId,userId,state:humanState,projectionDefinition:PROJECTIONS.human_state,output});
      human={snapshotId:humanSnapshot?.id||null,trajectoryId:humanTrajectoryId,unchanged:false,stateHash:humanState.state_hash,projectionHash:humanProjection.projection_hash};
    }
  }
  let dyadic=null;
  if(candidateUserId&&dyadContext){
    const dyadState=deriveDyadicFieldState({dyadicEvidence:summarizeDyadicEvidence(dyadContext.outcomeHistory||[]),observedAt,evidenceRefs});
    const dyadProjection=projectState(dyadState,PROJECTIONS.dyadic_field);
    const dyadSnapshot=await insertSnapshot({runId,userId,candidateUserId,state:dyadState,projection:dyadProjection,output});
    const dyadTrajectoryId=await persistTrajectory({runId,userId,candidateUserId,state:dyadState,projectionDefinition:PROJECTIONS.dyadic_field,output});
    dyadic={snapshotId:dyadSnapshot?.id||null,trajectoryId:dyadTrajectoryId,stateHash:dyadState.state_hash,projectionHash:dyadProjection.projection_hash};
  }
  const ast=compileJudgment(output,{validEvidenceRefs:evidenceRefs,ethicsClear,runId,candidateUserId,purpose:`${runType}_judgment`});
  const glyph=encode(ast);
  if(!glyph.reversible)throw Object.assign(new Error('Wonder glyph round-trip validation failed'),{code:'WONDER_GLYPH_NON_REVERSIBLE'});
  const glyphRows=await rest('/wonder_mind_glyph_programs?select=id',{method:'POST',admin:true,prefer:'return=representation',body:{user_id:userId,run_id:runId,judgment_id:judgmentId,language_version:GLYPH_LANGUAGE_VERSION,purpose:`${runType}_judgment`,canonical_ir:ast,tokens:glyph.tokens,serialized:glyph.serialized,source_hash:glyph.source_hash,round_trip_hash:glyph.round_trip_hash,reversible:glyph.reversible}});
  return {snapshotId:snapshot?.id||null,trajectoryId,glyphProgramId:glyphRows[0]?.id||null,stateHash:state.state_hash,projectionHash:projection.projection_hash,glyphHash:glyph.source_hash,glyphLanguage:GLYPH_LANGUAGE_VERSION,human,dyadic};
}

module.exports={persistRunRepresentations};
