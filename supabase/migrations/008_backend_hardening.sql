-- Wonder backend hardening v1
-- Database-level invariants for assessment and matching reliability.

-- One active assessment per user/version. Prevents double-click/device races
-- from creating parallel in-progress sessions for the same instrument version.
create unique index if not exists assessment_sessions_one_active_per_version
on public.assessment_sessions(user_id, questionnaire_version)
where status = 'in_progress';

-- Exactly one person-model snapshot per completed assessment session.
-- Historical versions of a person remain possible through new assessment sessions.
create unique index if not exists person_model_snapshots_one_per_session
on public.person_model_snapshots(assessment_session_id)
where assessment_session_id is not null;

-- Keep response metadata sane even if a malformed client bypasses UI validation.
alter table public.assessment_responses_v2
  drop constraint if exists assessment_responses_v2_changed_count_check;
alter table public.assessment_responses_v2
  add constraint assessment_responses_v2_changed_count_check check (changed_count >= 0);

alter table public.assessment_responses_v2
  drop constraint if exists assessment_responses_v2_response_time_check;
alter table public.assessment_responses_v2
  add constraint assessment_responses_v2_response_time_check check (response_time_ms is null or (response_time_ms >= 0 and response_time_ms <= 3600000));

-- Prevent duplicate feedback caused by retry/double tap. One current reaction per
-- user/match is enough for MVP; updates should replace it through upsert.
create unique index if not exists match_feedback_one_reaction_per_user_match
on public.match_feedback(user_id, match_id);

-- A directional match should be unique. This is required for idempotent match generation.
create unique index if not exists matches_one_directional_pair
on public.matches(user_id, matched_user_id);

-- Outcome submission should be idempotent per user/match when a match exists.
create unique index if not exists match_outcomes_one_per_user_match
on public.match_outcomes(user_id, match_id)
where match_id is not null;

-- Guard self-matches at the database boundary.
alter table public.matches drop constraint if exists matches_not_self_check;
alter table public.matches add constraint matches_not_self_check check (user_id <> matched_user_id);

alter table public.compatibility_scores drop constraint if exists compatibility_scores_not_self_check;
alter table public.compatibility_scores add constraint compatibility_scores_not_self_check check (user_id <> candidate_user_id);
