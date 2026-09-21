-- Private account security, controlled introductions, review, and departure.
create table public.wonder_usernames (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z][a-z0-9_]{2,29}$')
);
create table public.wonder_passkeys (
 credential_id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 public_key text not null, counter bigint not null default 0 check(counter>=0),
 transports jsonb not null default '[]', rp_id text not null, label text not null,
 backed_up boolean not null default false, created_at timestamptz not null default now(), last_used_at timestamptz
);
create index on public.wonder_passkeys(user_id);
create table public.wonder_passkey_challenges (
 id uuid primary key, kind text not null check(kind in ('registration','authentication')),
 user_id uuid references auth.users(id) on delete cascade, origin text not null, rp_id text not null,
 challenge text not null, expires_at timestamptz not null
);
create index on public.wonder_passkey_challenges(expires_at);
create table public.wonder_account_deletions (
 user_id uuid primary key, requested_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','complete')), completed_at timestamptz
);
create table public.wonder_portrait_photos (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique, mime text not null check(mime in ('image/jpeg','image/png','image/webp')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 review_note text, created_at timestamptz not null default now(), reviewed_at timestamptz
);
create index on public.wonder_portrait_photos(user_id);
create table public.wonder_cohort_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 cohort text not null, enabled boolean not null default false, approved_at timestamptz
);
create table public.wonder_support_requests (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
 subject_id uuid references auth.users(id) on delete set null, connection_id uuid references public.wonder_connections(id) on delete set null,
 reason text not null check(length(reason) between 1 and 3000), status text not null default 'open' check(status in ('open','reviewing','resolved')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.wonder_support_requests(reporter_id);
create table public.wonder_agent_proposals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 expected_version integer not null, proposal jsonb not null, expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index on public.wonder_agent_proposals(user_id);
-- No direct browser grants: authentication and action authorization live in the API.
do $$ declare t text; begin
 foreach t in array array['wonder_usernames','wonder_passkeys','wonder_passkey_challenges','wonder_account_deletions','wonder_portrait_photos','wonder_cohort_members','wonder_support_requests','wonder_agent_proposals'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create or replace function public.wonder_account_active() returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.wonder_account_deletions where user_id=(select auth.uid()))
$$;
revoke all on function public.wonder_account_active() from public,anon;
grant execute on function public.wonder_account_active() to authenticated,service_role;
-- A deletion request immediately removes access even before an old JWT expires.
do $$ declare t record; begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity loop
 execute format('create policy account_active on public.%I as restrictive for all to authenticated using ((select public.wonder_account_active())) with check ((select public.wonder_account_active()))',t.relname);
 end loop;
end $$;
-- Private bucket. There are deliberately no client storage policies for it.
do $$ begin
 if to_regclass('storage.buckets') is not null then
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('wonder-portraits','wonder-portraits',false,1048576,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 end if;
end $$;
create or replace function public.wonder_propose_connection(
 p_a uuid,p_b uuid,p_a_version integer,p_b_version integer,p_state jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.wonder_private_journey; b public.wonder_private_journey; result uuid;
begin
 if p_a>=p_b then raise exception 'Invalid pair'; end if;
 select * into a from public.wonder_private_journey where user_id=p_a for update;
 select * into b from public.wonder_private_journey where user_id=p_b for update;
 if a.user_id is null or b.user_id is null or a.version<>p_a_version or b.version<>p_b_version then raise exception 'Changed preferences'; end if;
 if not exists(select 1 from public.wonder_cohort_members x join public.wonder_cohort_members y on x.cohort=y.cohort where x.user_id=p_a and y.user_id=p_b and x.enabled and y.enabled) then raise exception 'Cohort access changed'; end if;
 if a.state->>'availability'<>'available' or b.state->>'availability'<>'available' then raise exception 'Unavailable'; end if;
 if exists(select 1 from public.wonder_account_deletions where user_id in(p_a,p_b)) then raise exception 'Unavailable'; end if;
 if exists(select 1 from public.wonder_connections where (member_a in(p_a,p_b) or member_b in(p_a,p_b)) and state->>'status' in('proposed','pending')) then raise exception 'Introduction already pending'; end if;
 insert into public.wonder_connections(member_a,member_b,state) values(p_a,p_b,p_state) returning id into result;
 return result;
end $$;
revoke all on function public.wonder_propose_connection(uuid,uuid,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.wonder_propose_connection(uuid,uuid,integer,integer,jsonb) to service_role;
-- Per-answer compare-and-swap prevents one device silently overwriting another.
create or replace function public.wonder_save_answer(p_user uuid,p_session uuid,p_item text,p_response jsonb,p_expected jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare current_response jsonb; current_status text;
begin
 select status into current_status from public.assessment_sessions where id=p_session and user_id=p_user for update;
 if current_status is distinct from 'in_progress' then raise exception 'Assessment unavailable'; end if;
 select response into current_response from public.assessment_responses_v2 where session_id=p_session and user_id=p_user and item_id=p_item;
 if current_response is distinct from nullif(p_expected,'null'::jsonb) and current_response is distinct from p_response then raise exception 'Answer changed on another device'; end if;
 insert into public.assessment_responses_v2(user_id,session_id,item_id,response,response_time_ms,changed_count,updated_at)
 values(p_user,p_session,p_item,p_response,null,0,now())
 on conflict(session_id,item_id) do update set response=excluded.response,updated_at=now();
end $$;
revoke all on function public.wonder_save_answer(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.wonder_save_answer(uuid,uuid,text,jsonb,jsonb) to service_role;
create or replace function public.wonder_accept_proposal(p_user uuid,p_proposal uuid,p_version integer,p_state jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v integer; proposal public.wonder_agent_proposals;
begin
 select version into v from public.wonder_private_journey where user_id=p_user for update;
 select * into proposal from public.wonder_agent_proposals where id=p_proposal and user_id=p_user for update;
 if v is distinct from p_version or proposal.id is null or proposal.expected_version<>v or proposal.expires_at<=now() then raise exception 'Proposal expired or context changed'; end if;
 if exists(select 1 from public.wonder_account_deletions where user_id=p_user) then raise exception 'Account unavailable'; end if;
 update public.wonder_private_journey set state=p_state,version=v+1,updated_at=now() where user_id=p_user;
 delete from public.wonder_agent_proposals where id=p_proposal;
end $$;
revoke all on function public.wonder_accept_proposal(uuid,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.wonder_accept_proposal(uuid,uuid,integer,jsonb) to service_role;
