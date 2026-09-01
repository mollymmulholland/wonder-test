'use strict';

const {rest}=require('./supabase-server');

function orderedPair(a,b){return String(a)<String(b)?[a,b]:[b,a];}
function enc(v){return encodeURIComponent(v);}

async function loadPublicCandidateContext(candidateUserId){
  const id=enc(candidateUserId);
  const [profiles,models,memories]=await Promise.all([
    rest(`/profiles?user_id=eq.${id}&select=user_id,first_name,current_city,gender,interested_in,relationship_intention,relationship_structure,children,age_range,max_distance,nonnegotiables,location_data,onboarding_complete&limit=1`,{admin:true}),
    rest(`/person_model_snapshots?user_id=eq.${id}&select=id,model_version,scores,confidence,evidence,created_at&order=created_at.desc&limit=2`,{admin:true}),
    rest(`/wonder_mind_memory?user_id=eq.${id}&superseded_by=is.null&allowed_uses=cs.{matching}&select=id,region_id,claim,epistemic_class,confidence,stability,context,allowed_uses,created_at&order=created_at.desc&limit=20`,{admin:true})
  ]);
  return {profile:profiles[0]||null,personModels:models,matchingMemories:memories};
}

async function loadDyadState(userId,candidateUserId){
  const [a,b]=orderedPair(userId,candidateUserId);
  const rows=await rest(`/wonder_mind_dyads?user_a_id=eq.${enc(a)}&user_b_id=eq.${enc(b)}&select=*&limit=1`,{admin:true});
  return rows[0]||null;
}

async function loadDyadOutcomes(userId,candidateUserId){
  const u=enc(userId),c=enc(candidateUserId);
  return rest(`/match_outcomes?or=(and(user_id.eq.${u},candidate_user_id.eq.${c}),and(user_id.eq.${c},candidate_user_id.eq.${u}))&select=id,user_id,candidate_user_id,met_in_person,wanted_second_date,felt_understood,conversational_ease,attraction,emotional_safety,intellectual_stimulation,values_fit,rejection_reasons,created_at&order=created_at.asc&limit=20`,{admin:true});
}

function summarizeOutcome(row){
  return {
    met_in_person:row.met_in_person,
    wanted_second_date:row.wanted_second_date,
    felt_understood:row.felt_understood,
    conversational_ease:row.conversational_ease,
    attraction:row.attraction,
    emotional_safety:row.emotional_safety,
    intellectual_stimulation:row.intellectual_stimulation,
    values_fit:row.values_fit,
    rejection_reasons:row.rejection_reasons,
    created_at:row.created_at
  };
}

async function loadDyadContext(userId,candidateUserId){
  if(!candidateUserId||candidateUserId===userId)return null;
  const [candidate,dyad,outcomes]=await Promise.all([
    loadPublicCandidateContext(candidateUserId),
    loadDyadState(userId,candidateUserId),
    loadDyadOutcomes(userId,candidateUserId)
  ]);
  return {
    candidate,
    dyad,
    outcomeHistory:outcomes.map(summarizeOutcome),
    privacyRule:'Candidate journals, Mirror corrections, raw private reflections, and non-matching memories are excluded. The user-facing answer must not reveal private candidate evidence.'
  };
}

async function upsertDyadState({userId,candidateUserId,state,confidence=.5,evidenceEventIds=[],latestJudgmentId=null,lastOutcomeAt=null}){
  const [user_a_id,user_b_id]=orderedPair(userId,candidateUserId);
  const rows=await rest('/wonder_mind_dyads?on_conflict=user_a_id,user_b_id&select=*',{method:'POST',admin:true,prefer:'resolution=merge-duplicates,return=representation',body:{user_a_id,user_b_id,state,confidence,evidence_event_ids:evidenceEventIds,latest_judgment_id:latestJudgmentId,last_outcome_at:lastOutcomeAt,updated_at:new Date().toISOString()}});
  return rows[0]||null;
}

module.exports={orderedPair,loadDyadContext,upsertDyadState};
