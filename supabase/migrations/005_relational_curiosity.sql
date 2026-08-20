-- Wonder relational curiosity system v1
-- Subjective reports are user-owned observations, never objective ratings of another person.

create table if not exists public.connection_reflections (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  encounter_number integer not null default 1 check (encounter_number > 0),
  stage text not null default 'early' check (stage in ('early','developing','established')),
  occurred_at timestamptz,
  desire_to_continue boolean,
  felt_safe smallint check (felt_safe between 1 and 7),
  felt_seen smallint check (felt_seen between 1 and 7),
  attraction smallint check (attraction between 1 and 7),
  curiosity smallint check (curiosity between 1 and 7),
  ease smallint check (ease between 1 and 7),
  reflection jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists connection_reflections_user_idx on public.connection_reflections(user_id, other_user_id, encounter_number desc);

create table if not exists public.relational_observations (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.connection_reflections(id) on delete cascade,
  observer_user_id uuid not null references auth.users(id) on delete cascade,
  other_user_id uuid not null references auth.users(id) on delete cascade,
  observation_type text not null check (observation_type in ('self_response','noticed_quality','interaction_pattern','open_question')),
  body text not null,
  subjective boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists relational_observations_observer_idx on public.relational_observations(observer_user_id, other_user_id, created_at desc);

alter table public.connection_reflections enable row level security;
alter table public.relational_observations enable row level security;

drop policy if exists "connection reflections own rows" on public.connection_reflections;
create policy "connection reflections own rows" on public.connection_reflections for all
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "relational observations observer only" on public.relational_observations;
create policy "relational observations observer only" on public.relational_observations for all
using (auth.uid() = observer_user_id) with check (auth.uid() = observer_user_id);

comment on table public.relational_observations is 'Private subjective observations. Never aggregate into objective labels, reputation scores, or user-facing claims about other_user_id.';