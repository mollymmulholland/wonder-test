-- Shared triggers must use a field-safe JSON lookup: not every source table has status.
CREATE OR REPLACE FUNCTION public.capture_wonder_mind_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
declare
  v_event_type text := TG_ARGV[0];
  v_payload jsonb := to_jsonb(NEW);
  v_scope text[] := array['self_understanding']::text[];
  v_sensitivity text := 'personal';
begin
  if TG_TABLE_NAME = 'assessment_sessions' and (v_payload->>'status' is distinct from 'completed') then
    return NEW;
  end if;
  if TG_TABLE_NAME in ('matches','compatibility_scores','match_outcomes','match_feedback') then
    v_scope := array['self_understanding','matching','relationship_guidance']::text[];
  elsif TG_TABLE_NAME in ('journal_entries','mirror_feedback','mirror_reports') then
    v_scope := array['self_understanding','relationship_guidance']::text[];
    v_sensitivity := 'sensitive';
  end if;
  insert into public.wonder_mind_events(user_id,event_type,source_table,source_id,occurred_at,payload,sensitivity,consent_scope,processing_status)
  values (NEW.user_id,v_event_type,TG_TABLE_NAME,NEW.id,coalesce(NEW.created_at,now()),v_payload,v_sensitivity,v_scope,'pending')
  on conflict do nothing;
  return NEW;
end;
$function$;
