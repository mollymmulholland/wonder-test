-- Wonder feedback + location metadata
-- Additive migration.

alter table public.profiles
  add column if not exists location_data jsonb not null default '{}'::jsonb;

alter table public.birth_data
  add column if not exists location_data jsonb not null default '{}'::jsonb;

create table if not exists public.mirror_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_model_snapshot_id uuid references public.person_model_snapshots(id) on delete set null,
  assessment_session_id uuid references public.assessment_sessions(id) on delete set null,
  overall_accuracy smallint check (overall_accuracy between 1 and 7),
  accurate_sections jsonb not null default '[]'::jsonb,
  inaccurate_sections jsonb not null default '[]'::jsonb,
  correction text,
  archetype_resonance smallint check (archetype_resonance between 1 and 7),
  created_at timestamptz not null default now()
);

create index if not exists mirror_feedback_user_idx
  on public.mirror_feedback(user_id, created_at desc);

alter table public.mirror_feedback enable row level security;

create policy "mirror feedback own rows"
on public.mirror_feedback for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
