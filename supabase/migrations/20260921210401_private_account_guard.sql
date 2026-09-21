-- Internal RLS support functions do not need to be exposed through the public API.
create schema if not exists wonder_internal;
revoke all on schema wonder_internal from public,anon;
grant usage on schema wonder_internal to authenticated,service_role;
create function wonder_internal.account_active() returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.wonder_account_deletions where user_id=(select auth.uid()))
$$;
revoke all on function wonder_internal.account_active() from public,anon;
grant execute on function wonder_internal.account_active() to authenticated,service_role;
do $$ declare t record; begin
 for t in select schemaname,tablename from pg_policies where policyname='account_active' and schemaname='public' loop
 execute format('alter policy account_active on %I.%I using ((select wonder_internal.account_active())) with check ((select wonder_internal.account_active()))',t.schemaname,t.tablename);
 end loop;
end $$;
drop function public.wonder_account_active();
