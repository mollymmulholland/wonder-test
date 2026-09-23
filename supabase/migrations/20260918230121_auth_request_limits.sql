create table if not exists public.wonder_auth_request_limits (
  bucket text primary key,
  calls integer not null,
  expires_at timestamptz not null
);
alter table public.wonder_auth_request_limits enable row level security;
revoke all on public.wonder_auth_request_limits from public, anon, authenticated;
grant select, insert, update, delete on public.wonder_auth_request_limits to service_role;
create or replace function public.wonder_auth_allow(p_bucket text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_calls integer;
begin
  if p_bucket !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 100 or p_seconds < 1 or p_seconds > 86400 then
    raise exception 'Invalid limit parameters';
  end if;
  delete from public.wonder_auth_request_limits where expires_at < now() - interval '1 day';
  insert into public.wonder_auth_request_limits as limits(bucket,calls,expires_at)
  values(p_bucket,1,now()+make_interval(secs=>p_seconds))
  on conflict(bucket) do update set
    calls=case when limits.expires_at<=now() then 1 else limits.calls+1 end,
    expires_at=case when limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else limits.expires_at end
  returning calls into v_calls;
  return v_calls<=p_limit;
end;
$$;
revoke all on function public.wonder_auth_allow(text,integer,integer) from public, anon, authenticated;
grant execute on function public.wonder_auth_allow(text,integer,integer) to service_role;
