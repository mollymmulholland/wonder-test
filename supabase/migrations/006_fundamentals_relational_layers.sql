-- Wonder Fundamentals of Love & Acceptance — relational layers v2
-- Run after 005_relational_curiosity.sql.

alter table public.connection_reflections
  add column if not exists mode text not null default 'reflection';

alter table public.connection_reflections
  drop constraint if exists connection_reflections_mode_check;
alter table public.connection_reflections
  add constraint connection_reflections_mode_check
  check (mode in ('curiosity','reflection','concern','excitement'));

alter table public.connection_reflections
  add column if not exists share_status text not null default 'private';
alter table public.connection_reflections
  drop constraint if exists connection_reflections_share_status_check;
alter table public.connection_reflections
  add constraint connection_reflections_share_status_check
  check (share_status in ('private','draft','shared'));

alter table public.connection_reflections
  add column if not exists share_payload jsonb not null default '{}'::jsonb;
alter table public.connection_reflections
  add column if not exists shared_at timestamptz;

alter table public.relational_observations
  add column if not exists epistemic_status text not null default 'observation';
alter table public.relational_observations
  drop constraint if exists relational_observations_epistemic_status_check;
alter table public.relational_observations
  add constraint relational_observations_epistemic_status_check
  check (epistemic_status in ('observation','interpretation','question'));

alter table public.relational_observations
  add column if not exists scope text not null default 'interaction';
alter table public.relational_observations
  drop constraint if exists relational_observations_scope_check;
alter table public.relational_observations
  add constraint relational_observations_scope_check
  check (scope in ('observer_self','interaction','subjective_other'));

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
create index if not exists relational_self_snapshots_user_idx
  on public.relational_self_snapshots(user_id, created_at desc);

alter table public.relational_self_snapshots enable row level security;
drop policy if exists "relational self snapshots own rows" on public.relational_self_snapshots;
create policy "relational self snapshots own rows"
  on public.relational_self_snapshots for select
  using (auth.uid() = user_id);

comment on table public.relational_self_snapshots is
'User-owned Layer 2 relational-self hypotheses derived only from the user own repeated relational responses. Never stores objective traits about partners.';

comment on column public.connection_reflections.share_status is
'Reflections are private by default. Shared means the user explicitly selected an item-specific payload for sharing.';

comment on column public.relational_observations.epistemic_status is
'Distinguishes direct observation from interpretation and open question so Wonder does not collapse inference into fact.';