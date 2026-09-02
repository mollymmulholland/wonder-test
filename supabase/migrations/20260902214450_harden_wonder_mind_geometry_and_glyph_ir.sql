-- Consolidate owner/admin reads and cover all representation foreign keys.

drop policy if exists users_read_own_mind_state_snapshots on public.wonder_mind_state_snapshots;
drop policy if exists admins_read_mind_state_snapshots on public.wonder_mind_state_snapshots;
create policy users_or_admins_read_mind_state_snapshots on public.wonder_mind_state_snapshots
  for select to authenticated using (
    (select auth.uid())=user_id
    or exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid()))
  );

drop policy if exists users_read_own_mind_trajectories on public.wonder_mind_trajectories;
drop policy if exists admins_read_mind_trajectories on public.wonder_mind_trajectories;
create policy users_or_admins_read_mind_trajectories on public.wonder_mind_trajectories
  for select to authenticated using (
    (select auth.uid())=user_id
    or exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid()))
  );

drop policy if exists users_read_own_mind_glyph_programs on public.wonder_mind_glyph_programs;
drop policy if exists admins_read_mind_glyph_programs on public.wonder_mind_glyph_programs;
create policy users_or_admins_read_mind_glyph_programs on public.wonder_mind_glyph_programs
  for select to authenticated using (
    (select auth.uid())=user_id
    or exists(select 1 from public.wonder_admins a where a.user_id=(select auth.uid()))
  );

create index if not exists wonder_mind_state_snapshots_candidate_idx
  on public.wonder_mind_state_snapshots(candidate_user_id) where candidate_user_id is not null;
create index if not exists wonder_mind_trajectories_candidate_idx
  on public.wonder_mind_trajectories(candidate_user_id) where candidate_user_id is not null;
create index if not exists wonder_mind_trajectories_run_idx
  on public.wonder_mind_trajectories(run_id) where run_id is not null;
create index if not exists wonder_mind_glyph_programs_run_idx
  on public.wonder_mind_glyph_programs(run_id) where run_id is not null;
create index if not exists wonder_mind_glyph_programs_judgment_idx
  on public.wonder_mind_glyph_programs(judgment_id) where judgment_id is not null;

