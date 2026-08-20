-- Wonder Fundamentals of Love & Acceptance — production reconciliation
-- Safe to run whether 005/006 were previously applied or not.

create extension if not exists pgcrypto;

create table if not exists public.connection_reflections (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_number integer not null default 1 check (encounter_number > 0),
  stage text not null default 'early',
  occurred_at timestamptz not null default now(),
  desire_to_continue boolean,
  felt_safe smallint check (felt_safe between 1 and 7),
  felt_seen smallint check (felt_seen between 1 and 7),
  attraction smallint check (attraction between 1 and 7),
  curiosity smallint check (curiosity between 1 and 7),
  ease smallint check (ease between 1 and 7),
  reflection jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.connection_reflections drop constraint if exists connection_reflections_stage_check;
alter table public.connection_reflections add constraint connection_reflections_stage_check check (stage in ('early','developing','established'));
alter table public.connection_reflections add column if not exists mode text not null default 'reflection';
alter table public.connection_reflections drop constraint if exists connection_reflections_mode_check;
alter table public.connection_reflections add constraint connection_reflections_mode_check check (mode in ('curiosity','reflection','concern','excitement'));
alter table public.connection_reflections add column if not exists share_status text not null default 'private';
alter table public.connection_reflections drop constraint if exists connection_reflections_share_status_check;
alter table public.connection_reflections add constraint connection_reflections_share_status_check check (share_status in ('private','draft','shared'));
alter table public.connection_reflections add column if not exists share_payload jsonb not null default '{}'::jsonb;
alter table public.connection_reflections add column if not exists shared_at timestamptz;

create index if not exists connection_reflections_user_idx on public.connection_reflections(user_id, occurred_at desc);
create index if not exists connection_reflections_pair_idx on public.connection_reflections(user_id, other_user_id, encounter_number desc);

create table if not exists public.relational_observations (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid references public.connection_reflections(id) on delete cascade,
  observer_user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  observation_type text not null,
  body text not null,
  subjective boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.relational_observations drop constraint if exists relational_observations_type_check;
alter table public.relational_observations add constraint relational_observations_type_check check (observation_type in ('self_response','noticed_quality','interaction_pattern','open_question'));
alter table public.relational_observations add column if not exists epistemic_status text not null default 'observation';
alter table public.relational_observations drop constraint if exists relational_observations_epistemic_status_check;
alter table public.relational_observations add constraint relational_observations_epistemic_status_check check (epistemic_status in ('observation','interpretation','question'));
alter table public.relational_observations add column if not exists scope text not null default 'interaction';
alter table public.relational_observations drop constraint if exists relational_observations_scope_check;
alter table public.relational_observations add constraint relational_observations_scope_check check (scope in ('observer_self','interaction','subjective_other'));

create index if not exists relational_observations_observer_idx on public.relational_observations(observer_user_id, created_at desc);
create index if not exists relational_observations_pair_idx on public.relational_observations(observer_user_id, other_user_id, created_at desc);

create table if not exists public.relational_self_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_version text not null default 'relational-self-v1',
  hypotheses jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  source_reflection_count integer not null default 0,
  distinct_connection_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists relational_self_snapshots_user_idx on public.relational_self_snapshots(user_id, created_at desc);

alter table public.connection_reflections enable row level security;
alter table public.relational_observations enable row level security;
alter table public.relational_self_snapshots enable row level security;

drop policy if exists "connection reflections own rows" on public.connection_reflections;
create policy "connection reflections own rows" on public.connection_reflections for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "relational observations own rows" on public.relational_observations;
create policy "relational observations own rows" on public.relational_observations for all
using (auth.uid() = observer_user_id) with check (auth.uid() = observer_user_id);

drop policy if exists "relational self snapshots own rows" on public.relational_self_snapshots;
create policy "relational self snapshots own rows" on public.relational_self_snapshots for select
using (auth.uid() = user_id);

comment on table public.connection_reflections is 'Private-by-default post-encounter reflections. Wonder uses them to learn about the observer and pair-specific interaction, never to construct an objective reputation model of the other user.';
comment on table public.relational_observations is 'Layer 3 subjective evidence. Observer, observed person, context, epistemic status, and subjectivity must remain attached.';
comment on table public.relational_self_snapshots is 'Layer 2 user-owned hypotheses derived only from repeated relational experience. Never stores objective traits about partners.';
comment on column public.connection_reflections.share_status is 'Private by default. Shared requires explicit item-specific user consent.';
comment on column public.relational_observations.epistemic_status is 'Separates direct observation from interpretation and open question.';