-- =============================================================================
-- Afrivate M&E - Deploy volunteer and organisation surveys independently
--
-- A deployment can target the volunteer only, the organisation only, or both.
-- VPI is calculated when the required surveys for that deployment are in:
--   * both parties  → org-rated VPI (primary score)
--   * volunteer only → volunteer self-report VPI
--   * organisation only → org effectiveness VPI
-- =============================================================================

alter table public.deployments alter column volunteer_id drop not null;
alter table public.deployments alter column organisation_id drop not null;

alter table public.deployments drop constraint if exists deployments_party_check;
alter table public.deployments add constraint deployments_party_check
  check (volunteer_id is not null or organisation_id is not null);

create or replace function public.recalc_deployment_vpi(p_deployment_id uuid)
returns void language plpgsql as $$
declare
  d       public.deployments%rowtype;
  v_org   public.org_surveys%rowtype;
  v_vol   public.volunteer_surveys%rowtype;
  v_has_org boolean;
  v_has_vol boolean;
  v_score numeric;
  v_cat   text;
  v_needs_vol boolean;
  v_needs_org boolean;
begin
  select * into d from public.deployments where id = p_deployment_id;
  if not found then return; end if;

  v_needs_vol := d.volunteer_id is not null;
  v_needs_org := d.organisation_id is not null;

  select * into v_org from public.org_surveys where deployment_id = p_deployment_id;
  v_has_org := found;
  select * into v_vol from public.volunteer_surveys where deployment_id = p_deployment_id;
  v_has_vol := found;

  if v_needs_vol and v_needs_org then
    -- Paired deployment: primary VPI only when both surveys are in.
    if v_has_vol and v_has_org then
      v_score := v_org.org_vpi;
      v_cat := public.vpi_category(v_score);
      update public.deployments
        set vpi_score = v_score, vpi_category = v_cat,
            action_flag = public.vpi_action_flag(v_cat),
            status = 'SURVEYS_COMPLETE', updated_at = now()
        where id = p_deployment_id;
      return;
    end if;
  elsif v_needs_vol and not v_needs_org then
    if v_has_vol then
      v_score := v_vol.volunteer_vpi;
      v_cat := public.vpi_category(v_score);
      update public.deployments
        set vpi_score = v_score, vpi_category = v_cat,
            action_flag = public.vpi_action_flag(v_cat),
            status = 'SURVEYS_COMPLETE', updated_at = now()
        where id = p_deployment_id;
      return;
    end if;
  elsif v_needs_org and not v_needs_vol then
    if v_has_org then
      v_score := v_org.org_vpi;
      v_cat := public.vpi_category(v_score);
      update public.deployments
        set vpi_score = v_score, vpi_category = v_cat,
            action_flag = public.vpi_action_flag(v_cat),
            status = 'SURVEYS_COMPLETE', updated_at = now()
        where id = p_deployment_id;
      return;
    end if;
  end if;

  update public.deployments
    set status = 'AWAITING_SURVEYS', updated_at = now()
    where id = p_deployment_id
      and status not in ('SURVEYS_COMPLETE', 'COMPLETED');
end; $$;

-- Backfill status/VPI for existing rows.
do $$
declare r record;
begin
  for r in select id from public.deployments loop
    perform public.recalc_deployment_vpi(r.id);
  end loop;
end $$;
