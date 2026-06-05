-- =============================================================================
-- Afrivate M&E - VPI scoring engine (database side, source of truth)
-- Mirrors src/utils/vpiEngine.js and spec Sections 5 & 11.
--
--   VPI% = ((taskPerf + professionalism + impact + (overall10 / 2)) / 4) * 20
--
-- BEFORE INSERT triggers compute each survey's section averages + VPI.
-- AFTER INSERT triggers recompute the parent deployment: only when BOTH
-- surveys exist is the org-rated VPI written as the deployment's primary score.
-- =============================================================================

create or replace function public.vpi_percent(task numeric, prof numeric, impact numeric, overall10 numeric)
returns numeric language sql immutable as $$
  select round((((task + prof + impact + (overall10 / 2.0)) / 4.0) * 20.0)::numeric, 2);
$$;

create or replace function public.vpi_category(vpi numeric)
returns text language sql immutable as $$
  select case when vpi >= 80 then 'A' when vpi >= 60 then 'B' else 'C' end;
$$;

create or replace function public.vpi_action_flag(cat text)
returns text language sql immutable as $$
  select case cat
    when 'A' then 'Retain & Recognise'
    when 'B' then 'Develop & Monitor'
    else 'Urgent Review'
  end;
$$;

-- --- Section averages: volunteer survey -------------------------------------
create or replace function public.compute_volunteer_survey_avgs()
returns trigger language plpgsql as $$
declare
  onboarding numeric;
  work_exp   numeric;
  org_env    numeric;
begin
  onboarding := (new.s2_clear_briefing + new.s2_felt_welcome + new.s2_tools_available
                 + new.s2_afrivate_support + new.s2_knew_who_to_contact) / 5.0;
  work_exp := (new.s3_skills_matched + new.s3_meaningful_impact + new.s3_appropriate_responsibility
               + new.s3_manageable_workload + new.s3_useful_feedback + new.s3_learning_opportunities) / 6.0;
  org_env := (new.s4_inclusive_culture + new.s4_safe_environment + new.s4_collaborative_staff
              + new.s4_clear_communication) / 4.0;

  new.onboarding_avg := round(onboarding, 2);
  new.work_exp_avg   := round(work_exp, 2);
  new.org_env_avg    := round(org_env, 2);
  -- Volunteer VPI uses section averages as proxy dimensions (matches calcVolSectionAvgs)
  new.volunteer_vpi  := public.vpi_percent(work_exp, onboarding, org_env, new.s5_overall_satisfaction);
  return new;
end; $$;

drop trigger if exists volunteer_surveys_compute_avgs on public.volunteer_surveys;
create trigger volunteer_surveys_compute_avgs
  before insert on public.volunteer_surveys
  for each row execute function public.compute_volunteer_survey_avgs();

-- --- Section averages: org survey -------------------------------------------
create or replace function public.compute_org_survey_avgs()
returns trigger language plpgsql as $$
declare
  task_perf numeric;
  prof      numeric;
  impact    numeric;
begin
  task_perf := (new.s2_tasks_completed + new.s2_skills_demonstrated + new.s2_deadlines_met
                + new.s2_initiative + new.s2_work_quality + new.s2_minimal_supervision) / 6.0;
  prof := (new.s3_professional_behaviour + new.s3_clear_communication + new.s3_policy_adherence
           + new.s3_punctuality + new.s3_team_integration) / 5.0;
  impact := (new.s4_measurable_value + new.s4_mission_support + new.s4_irreplaceable_contrib
             + new.s4_moral_effect) / 4.0;

  new.task_perf_avg       := round(task_perf, 2);
  new.professionalism_avg := round(prof, 2);
  new.impact_avg          := round(impact, 2);
  new.org_vpi             := public.vpi_percent(task_perf, prof, impact, new.s5_overall_effectiveness);
  return new;
end; $$;

drop trigger if exists org_surveys_compute_avgs on public.org_surveys;
create trigger org_surveys_compute_avgs
  before insert on public.org_surveys
  for each row execute function public.compute_org_survey_avgs();

-- --- Recompute the deployment when surveys change ----------------------------
create or replace function public.recalc_deployment_vpi(p_deployment_id uuid)
returns void language plpgsql as $$
declare
  v_org   public.org_surveys%rowtype;
  v_vol   public.volunteer_surveys%rowtype;
  v_has_org boolean;
  v_has_vol boolean;
  v_score numeric;
  v_cat   text;
begin
  select * into v_org from public.org_surveys where deployment_id = p_deployment_id;
  v_has_org := found;
  select * into v_vol from public.volunteer_surveys where deployment_id = p_deployment_id;
  v_has_vol := found;

  if v_has_org and v_has_vol then
    -- Both present: org-rated VPI is the primary score (spec Section 11).
    v_score := v_org.org_vpi;
    v_cat := public.vpi_category(v_score);
    update public.deployments
      set vpi_score = v_score,
          vpi_category = v_cat,
          action_flag = public.vpi_action_flag(v_cat),
          status = 'SURVEYS_COMPLETE',
          updated_at = now()
      where id = p_deployment_id;
  else
    -- Only one survey so far: keep deployment partial, do not write a VPI.
    update public.deployments
      set status = 'AWAITING_SURVEYS',
          updated_at = now()
      where id = p_deployment_id
        and status not in ('SURVEYS_COMPLETE', 'COMPLETED');
  end if;
end; $$;

create or replace function public.on_survey_insert()
returns trigger language plpgsql as $$
begin
  perform public.recalc_deployment_vpi(new.deployment_id);
  -- Mark the matching token as used (one-time use, spec Section 16).
  update public.survey_tokens
    set used = true
    where deployment_id = new.deployment_id
      and type = (case when tg_table_name = 'org_surveys' then 'org' else 'volunteer' end);
  return new;
end; $$;

drop trigger if exists volunteer_surveys_recalc on public.volunteer_surveys;
create trigger volunteer_surveys_recalc
  after insert on public.volunteer_surveys
  for each row execute function public.on_survey_insert();

drop trigger if exists org_surveys_recalc on public.org_surveys;
create trigger org_surveys_recalc
  after insert on public.org_surveys
  for each row execute function public.on_survey_insert();
