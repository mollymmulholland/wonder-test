-- Wonder Cognitive Geometry + Wonder Glyph Language IR
-- Geometry is a versioned, reversible observability representation; it is not a claim that a person is three-dimensional.

create table if not exists public.wonder_mind_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_user_id uuid references auth.users(id) on delete cascade,
  run_id uuid references public.wonder_mind_inference_runs(id) on delete set null,
  entity_type text not null check (entity_type in ('cognitive_process','human_state','dyadic_field','developmental_state')),
  space_version text not null,
  state_hash text not null check (length(state_hash)=64),
  dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(dimensions)='object'),
  projection jsonb not null default '{}'::jsonb check (jsonb_typeof(projection)='object'),
  evidence_refs text[] not null default '{}',
  epistemic_class text not null,
  confidence numeric not null check (confidence between 0 and 1),
  observed_at timestamptz not null default now(),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance)='object'),
  created_at timestamptz not null default now(),
  unique (user_id, run_id, entity_type, state_hash)
);

create index if not exists wonder_mind_state_snapshots_user_time_idx
  on public.wonder_mind_state_snapshots(user_id, entity_type, observed_at desc);
create index if not exists wonder_mind_state_snapshots_run_idx
  on public.wonder_mind_state_snapshots(run_id) where run_id is not null;

create table if not exists public.wonder_mind_trajectories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_user_id uuid references auth.users(id) on delete cascade,
  run_id uuid references public.wonder_mind_inference_runs(id) on delete set null,
  entity_type text not null check (entity_type in ('cognitive_process','human_state','dyadic_field','developmental_state')),
  projection_id text not null,
  trajectory_hash text not null check (length(trajectory_hash)=64),
  points jsonb not null default '[]'::jsonb check (jsonb_typeof(points)='array'),
  segments jsonb not null default '[]'::jsonb check (jsonb_typeof(segments)='array'),
  branches jsonb not null default '[]'::jsonb check (jsonb_typeof(branches)='array'),
  coverage numeric not null default 0 check (coverage between 0 and 1),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  causal_status text not null check (causal_status in ('observed_path_not_forecast','plausible_branches_not_predictions','calibrated_forecast')),
  epistemic_note text not null,
  created_at timestamptz not null default now(),
  unique (user_id, run_id, entity_type, trajectory_hash)
);

create index if not exists wonder_mind_trajectories_user_time_idx
  on public.wonder_mind_trajectories(user_id, entity_type, created_at desc);

create table if not exists public.wonder_mind_glyph_lexicon (
  glyph_code text primary key,
  operator text not null unique,
  name text not null,
  language_version text not null,
  semantic_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(semantic_contract)='object'),
  visual_grammar jsonb not null default '{}'::jsonb check (jsonb_typeof(visual_grammar)='object'),
  status text not null default 'experimental' check (status in ('experimental','candidate','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wonder_mind_glyph_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.wonder_mind_inference_runs(id) on delete set null,
  judgment_id uuid references public.wonder_mind_judgments(id) on delete set null,
  language_version text not null,
  purpose text not null,
  canonical_ir jsonb not null check (jsonb_typeof(canonical_ir)='object'),
  tokens jsonb not null check (jsonb_typeof(tokens)='array'),
  serialized text not null,
  source_hash text not null check (length(source_hash)=64),
  round_trip_hash text not null check (length(round_trip_hash)=64),
  reversible boolean not null default false,
  created_at timestamptz not null default now(),
  constraint wonder_mind_glyph_round_trip check (reversible and source_hash=round_trip_hash),
  unique (user_id, run_id, purpose, source_hash)
);

create index if not exists wonder_mind_glyph_programs_user_time_idx
  on public.wonder_mind_glyph_programs(user_id, created_at desc);

alter table public.wonder_mind_state_snapshots enable row level security;
alter table public.wonder_mind_trajectories enable row level security;
alter table public.wonder_mind_glyph_lexicon enable row level security;
alter table public.wonder_mind_glyph_programs enable row level security;

drop policy if exists users_read_own_mind_state_snapshots on public.wonder_mind_state_snapshots;
create policy users_read_own_mind_state_snapshots on public.wonder_mind_state_snapshots
  for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists users_delete_own_mind_state_snapshots on public.wonder_mind_state_snapshots;
create policy users_delete_own_mind_state_snapshots on public.wonder_mind_state_snapshots
  for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists admins_read_mind_state_snapshots on public.wonder_mind_state_snapshots;
create policy admins_read_mind_state_snapshots on public.wonder_mind_state_snapshots
  for select to authenticated using (exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid())));

drop policy if exists users_read_own_mind_trajectories on public.wonder_mind_trajectories;
create policy users_read_own_mind_trajectories on public.wonder_mind_trajectories
  for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists users_delete_own_mind_trajectories on public.wonder_mind_trajectories;
create policy users_delete_own_mind_trajectories on public.wonder_mind_trajectories
  for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists admins_read_mind_trajectories on public.wonder_mind_trajectories;
create policy admins_read_mind_trajectories on public.wonder_mind_trajectories
  for select to authenticated using (exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid())));

drop policy if exists admins_read_mind_glyph_lexicon on public.wonder_mind_glyph_lexicon;
create policy admins_read_mind_glyph_lexicon on public.wonder_mind_glyph_lexicon
  for select to authenticated using (exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid())));

drop policy if exists users_read_own_mind_glyph_programs on public.wonder_mind_glyph_programs;
create policy users_read_own_mind_glyph_programs on public.wonder_mind_glyph_programs
  for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists users_delete_own_mind_glyph_programs on public.wonder_mind_glyph_programs;
create policy users_delete_own_mind_glyph_programs on public.wonder_mind_glyph_programs
  for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists admins_read_mind_glyph_programs on public.wonder_mind_glyph_programs;
create policy admins_read_mind_glyph_programs on public.wonder_mind_glyph_programs
  for select to authenticated using (exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid())));

revoke all on public.wonder_mind_state_snapshots, public.wonder_mind_trajectories, public.wonder_mind_glyph_lexicon, public.wonder_mind_glyph_programs from anon;
grant select, delete on public.wonder_mind_state_snapshots, public.wonder_mind_trajectories, public.wonder_mind_glyph_programs to authenticated;
grant select on public.wonder_mind_glyph_lexicon to authenticated;
grant all on public.wonder_mind_state_snapshots, public.wonder_mind_trajectories, public.wonder_mind_glyph_lexicon, public.wonder_mind_glyph_programs to service_role;

insert into public.wonder_mind_glyph_lexicon(glyph_code,operator,name,language_version,semantic_contract,visual_grammar,status) values
('E000','PROGRAM','program','wgl-ir/1','{"arity":"many","canonical_operator":"PROGRAM"}','{"family":"wonder_compositional_marks_v1","rendering":"svg_or_custom_font"}','experimental'),
('E001','OBSERVE','observation','wgl-ir/1','{"arity":"many","canonical_operator":"OBSERVE"}','{"family":"wonder_compositional_marks_v1","primitive":"open_eye"}','experimental'),
('E002','INFER','inference','wgl-ir/1','{"arity":"many","canonical_operator":"INFER"}','{"family":"wonder_compositional_marks_v1","primitive":"joined_arc"}','experimental'),
('E003','HYPOTHESIS','hypothesis','wgl-ir/1','{"arity":"many","canonical_operator":"HYPOTHESIS"}','{"family":"wonder_compositional_marks_v1","primitive":"open_spiral"}','experimental'),
('E004','PREDICT','prediction','wgl-ir/1','{"arity":"many","canonical_operator":"PREDICT"}','{"family":"wonder_compositional_marks_v1","primitive":"forward_branch"}','experimental'),
('E005','JUDGE','judgment','wgl-ir/1','{"arity":"many","canonical_operator":"JUDGE"}','{"family":"wonder_compositional_marks_v1","primitive":"balanced_axis"}','experimental'),
('E006','SUPPORT','support','wgl-ir/1','{"arity":"many","canonical_operator":"SUPPORT"}','{"family":"wonder_compositional_marks_v1","primitive":"underbrace"}','experimental'),
('E007','CONTRADICT','counterevidence','wgl-ir/1','{"arity":"many","canonical_operator":"CONTRADICT"}','{"family":"wonder_compositional_marks_v1","primitive":"crossed_arc"}','experimental'),
('E008','ALTERNATIVE','alternative','wgl-ir/1','{"arity":"many","canonical_operator":"ALTERNATIVE"}','{"family":"wonder_compositional_marks_v1","primitive":"fork"}','experimental'),
('E009','UNCERTAINTY','uncertainty','wgl-ir/1','{"arity":0,"canonical_operator":"UNCERTAINTY"}','{"family":"wonder_compositional_marks_v1","primitive":"broken_ring"}','experimental'),
('E00A','TIME','time','wgl-ir/1','{"arity":"many","canonical_operator":"TIME"}','{"family":"wonder_compositional_marks_v1","primitive":"stratified_line"}','experimental'),
('E00B','DYAD','dyad','wgl-ir/1','{"arity":"many","canonical_operator":"DYAD"}','{"family":"wonder_compositional_marks_v1","primitive":"interlocking_orbits"}','experimental'),
('E00C','BRANCH','scenario branch','wgl-ir/1','{"arity":"many","canonical_operator":"BRANCH"}','{"family":"wonder_compositional_marks_v1","primitive":"three_way_branch"}','experimental'),
('E00D','BOUNDARY','constitutional boundary','wgl-ir/1','{"arity":"many","canonical_operator":"BOUNDARY"}','{"family":"wonder_compositional_marks_v1","primitive":"enclosing_gate"}','experimental'),
('E00E','CORRECT','correction','wgl-ir/1','{"arity":"many","canonical_operator":"CORRECT"}','{"family":"wonder_compositional_marks_v1","primitive":"returning_stroke"}','experimental'),
('E00F','ABSTAIN','abstention','wgl-ir/1','{"arity":"many","canonical_operator":"ABSTAIN"}','{"family":"wonder_compositional_marks_v1","primitive":"closed_gate"}','experimental'),
('E010','CLAIM','claim','wgl-ir/1','{"arity":0,"canonical_operator":"CLAIM"}','{"family":"wonder_compositional_marks_v1","primitive":"inscribed_point"}','experimental'),
('E011','EVIDENCE_REF','evidence reference','wgl-ir/1','{"arity":0,"canonical_operator":"EVIDENCE_REF"}','{"family":"wonder_compositional_marks_v1","primitive":"root_mark"}','experimental'),
('E012','CHANGE_CONDITION','falsification condition','wgl-ir/1','{"arity":0,"canonical_operator":"CHANGE_CONDITION"}','{"family":"wonder_compositional_marks_v1","primitive":"hinged_arrow"}','experimental'),
('E013','CONFIDENCE','confidence','wgl-ir/1','{"arity":0,"canonical_operator":"CONFIDENCE"}','{"family":"wonder_compositional_marks_v1","primitive":"weighted_dot"}','experimental')
on conflict (glyph_code) do update set
  operator=excluded.operator,
  name=excluded.name,
  language_version=excluded.language_version,
  semantic_contract=excluded.semantic_contract,
  visual_grammar=excluded.visual_grammar,
  updated_at=now();

