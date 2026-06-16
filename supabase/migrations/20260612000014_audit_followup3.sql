-- =============================================================================
-- Afrivate M&E — Audit follow-up 3: token visibility for all staff + archived guards
-- =============================================================================

-- VIEWER role needs survey token status (used/expiry) for deployment dashboards.
-- Write access remains staff-writer only (migration 011).
drop policy if exists survey_tokens_read on public.survey_tokens;
create policy survey_tokens_read on public.survey_tokens
  for select to authenticated
  using (true);

-- Block hard deletes on archived deployments (soft-archive is the intended path).
create or replace function public.block_archived_deployment_delete()
returns trigger language plpgsql as $$
begin
  if old.archived_at is not null then
    raise exception 'This deployment has been removed and cannot be changed';
  end if;
  return old;
end; $$;

drop trigger if exists deployments_block_archived_delete on public.deployments;
create trigger deployments_block_archived_delete
  before delete on public.deployments
  for each row execute function public.block_archived_deployment_delete();

-- Block edits to archived volunteers and organisations.
create or replace function public.block_archived_entity_writes()
returns trigger language plpgsql as $$
begin
  if old.archived_at is not null then
    raise exception 'This record has been archived and cannot be changed';
  end if;
  return new;
end; $$;

drop trigger if exists volunteers_block_archived_update on public.volunteers;
create trigger volunteers_block_archived_update
  before update on public.volunteers
  for each row execute function public.block_archived_entity_writes();

drop trigger if exists organisations_block_archived_update on public.organisations;
create trigger organisations_block_archived_update
  before update on public.organisations
  for each row execute function public.block_archived_entity_writes();
