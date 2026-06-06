-- =============================================================================
-- Afrivate M&E — Fix VPI recalc (survey_target + tokens), soft archive support
-- =============================================================================

-- Persist which surveys this deployment requires (set at creation time).
alter table public.deployments
  add column if not exists survey_target text;

alter table public.deployments drop constraint if exists deployments_survey_target_check;
alter table public.deployments add constraint deployments_survey_target_check
  check (survey_target is null or survey_target in ('volunteer', 'organisation', 'both'));

-- Soft archive: records stay in DB for reports; hidden from active lists.
alter table public.volunteers add column if not exists archived_at timestamptz;
alter table public.organisations add column if not exists archived_at timestamptz;
alter table public.deployments add column if not exists archived_at timestamptz;

create index if not exists volunteers_active_idx on public.volunteers (archived_at) where archived_at is null;
create index if not exists organisations_active_idx on public.organisations (archived_at) where archived_at is null;
create index if not exists deployments_active_idx on public.deployments (archived_at) where archived_at is null;

-- Backfill survey_target from existing survey_tokens.
update public.deployments d
set survey_target = case
  when exists (select 1 from public.survey_tokens t where t.deployment_id = d.id and t.type = 'volunteer')
   and exists (select 1 from public.survey_tokens t where t.deployment_id = d.id and t.type = 'org')
    then 'both'
  when exists (select 1 from public.survey_tokens t where t.deployment_id = d.id and t.type = 'volunteer')
    then 'volunteer'
  when exists (select 1 from public.survey_tokens t where t.deployment_id = d.id and t.type = 'org')
    then 'organisation'
  else 'both'
end
where d.survey_target is null;

create or replace function public.recalc_deployment_vpi(p_deployment_id uuid)
returns void language plpgsql as $$
declare
  d         public.deployments%rowtype;
  v_org     public.org_surveys%rowtype;
  v_vol     public.volunteer_surveys%rowtype;
  v_has_org boolean;
  v_has_vol boolean;
  v_target  text;
  v_score   numeric;
  v_cat     text;
  v_needs_vol boolean;
  v_needs_org boolean;
begin
  select * into d from public.deployments where id = p_deployment_id;
  if not found then return; end if;

  v_target := d.survey_target;
  if v_target is null then
    select case
      when bool_or(type = 'volunteer') and bool_or(type = 'org') then 'both'
      when bool_or(type = 'volunteer') then 'volunteer'
      when bool_or(type = 'org') then 'organisation'
      else 'both'
    end into v_target
    from public.survey_tokens
    where deployment_id = p_deployment_id;
  end if;
  v_target := coalesce(v_target, 'both');

  v_needs_vol := v_target in ('volunteer', 'both');
  v_needs_org := v_target in ('organisation', 'both');

  select * into v_org from public.org_surveys where deployment_id = p_deployment_id;
  v_has_org := found;
  select * into v_vol from public.volunteer_surveys where deployment_id = p_deployment_id;
  v_has_vol := found;

  if v_target = 'both' then
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
  elsif v_target = 'volunteer' then
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
  elsif v_target = 'organisation' then
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
    set vpi_score = null, vpi_category = null, action_flag = null,
        status = 'AWAITING_SURVEYS', updated_at = now()
    where id = p_deployment_id
      and status not in ('COMPLETED');
end; $$;

-- Recalculate all deployments (fixes scores stuck after partial surveys).
do $$
declare r record;
begin
  for r in select id from public.deployments where archived_at is null loop
    perform public.recalc_deployment_vpi(r.id);
  end loop;
end $$;
