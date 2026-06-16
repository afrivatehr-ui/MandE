-- =============================================================================
-- Afrivate M&E — Audit follow-up: restrict publish RPC to staff writers
-- =============================================================================

create or replace function public.publish_due_surveys()
returns integer language plpgsql security definer set search_path = public as $$
declare
  cnt integer;
begin
  if not public.is_staff_writer() then
    raise exception 'Not authorised';
  end if;

  update public.surveys
  set status = 'PUBLISHED',
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where status = 'SCHEDULED'
    and scheduled_at is not null
    and scheduled_at <= now();

  get diagnostics cnt = row_count;
  return cnt;
end; $$;

grant execute on function public.publish_due_surveys() to authenticated;
