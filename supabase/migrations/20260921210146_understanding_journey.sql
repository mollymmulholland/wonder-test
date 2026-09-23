-- Applied to the hosted project on 2026-09-21.
-- Private evidence and operational introduction objects must not share read policies.
create table if not exists public.wonder_private_journey (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version integer not null default 0 check(version >= 0),
 state jsonb not null check(jsonb_typeof(state)='object'),
 updated_at timestamptz not null default now()
);
alter table public.wonder_private_journey enable row level security;
revoke all on public.wonder_private_journey from public, anon, authenticated;
grant select on public.wonder_private_journey to authenticated;
grant all on public.wonder_private_journey to service_role;
create policy journey_owner_read on public.wonder_private_journey for select to authenticated
using ((select auth.uid()) = user_id and coalesce((state->>'deleted')::boolean,false)=false);
-- No direct client mutation grants. The authenticated server derives user_id,
-- applies allowlisted events, and uses version-qualified compare-and-swap writes.

-- Pair records contain shared operational state only, never private evidence.
create table if not exists public.wonder_connections (
 id uuid primary key default gen_random_uuid(),
 member_a uuid not null references auth.users(id) on delete cascade,
 member_b uuid not null references auth.users(id) on delete cascade,
 state jsonb not null check(jsonb_typeof(state)='object'),
 version integer not null default 0,
 updated_at timestamptz not null default now(),
 check(member_a < member_b),
 unique(member_a,member_b)
);
alter table public.wonder_connections enable row level security;
revoke all on public.wonder_connections from public,anon,authenticated;
grant all on public.wonder_connections to service_role;
-- All reads use a server-side member check and an allowlisted shared projection.
-- This invoker RPC is server-only and serializes against both private records,
-- so a changed hard preference, consent withdrawal, or pause wins over stale screens.
create or replace function public.wonder_commit_connection(
 p_actor uuid,p_id uuid,p_version integer,p_a_version integer,p_b_version integer,p_state jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.wonder_connections; a public.wonder_private_journey; b public.wonder_private_journey;
begin
 select * into c from public.wonder_connections where id=p_id;
 if not found or p_actor not in (c.member_a,c.member_b) then raise exception 'Connection not found'; end if;
 select * into a from public.wonder_private_journey where user_id=c.member_a for update;
 select * into b from public.wonder_private_journey where user_id=c.member_b for update;
 select * into c from public.wonder_connections where id=p_id for update;
 if a.user_id is null or b.user_id is null or a.version<>p_a_version or b.version<>p_b_version or c.version<>p_version then raise exception 'Stale connection or changed preferences'; end if;
 if coalesce((a.state->>'deleted')::boolean,false) or coalesce((b.state->>'deleted')::boolean,false) then raise exception 'Account unavailable'; end if;
 update public.wonder_connections set state=p_state,version=p_version+1,updated_at=now() where id=p_id;
 return p_state;
end $$;
revoke all on function public.wonder_commit_connection(uuid,uuid,integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.wonder_commit_connection(uuid,uuid,integer,integer,integer,jsonb) to service_role;
