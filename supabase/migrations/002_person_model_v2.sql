-- Wonder assessment + matching schema v2
-- Additive migration: does not remove the preview v1 tables.

create table if not exists public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  questionnaire_version text not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessment_sessions_user_idx
  on public.assessment_sessions(user_id, started_at desc);

create table if not exists public.assessment_responses_v2 (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  response jsonb not null,
  response_time_ms integer,
  changed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, item_id)
);

create index if not exists assessment_responses_v2_user_idx
  on public.assessment_responses_v2(user_id, session_id);

create table if not exists public.person_model_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_session_id uuid references public.assessment_sessions(id) on delete set null,
  model_version text not null,
  scores jsonb not null default '{}'::jsonb,
  confidence jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  archetypes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists person_model_snapshots_user_idx
  on public.person_model_snapshots(user_id, created_at desc);

create table if not exists public.compatibility_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  engine_version text not null,
  eligible boolean not null,
  score numeric,
  confidence numeric,
  components jsonb not null default '{}'::jsonb,
  hard_conflicts jsonb not null default '[]'::jsonb,
  rationale jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, candidate_user_id, engine_version)
);

create index if not exists compatibility_scores_user_idx
  on public.compatibility_scores(user_id, score desc);

create table if not exists public.match_outcomes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_user_id uuid not null references auth.users(id) on delete cascade,
  met_in_person boolean,
  wanted_second_date boolean,
  felt_understood smallint check (felt_understood between 1 and 7),
  conversational_ease smallint check (conversational_ease between 1 and 7),
  attraction smallint check (attraction between 1 and 7),
  emotional_safety smallint check (emotional_safety between 1 and 7),
  intellectual_stimulation smallint check (intellectual_stimulation between 1 and 7),
  values_fit smallint check (values_fit between 1 and 7),
  rejection_reasons jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.assessment_sessions enable row level security;
alter table public.assessment_responses_v2 enable row level security;
alter table public.person_model_snapshots enable row level security;
alter table public.compatibility_scores enable row level security;
alter table public.match_outcomes enable row level security;

create policy "assessment sessions own rows"
on public.assessment_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "assessment responses v2 own rows"
on public.assessment_responses_v2 for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "person model snapshots own rows"
on public.person_model_snapshots for select
using (auth.uid() = user_id);

create policy "compatibility visible to owner"
on public.compatibility_scores for select
using (auth.uid() = user_id);

create policy "match outcomes own rows"
on public.match_outcomes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
