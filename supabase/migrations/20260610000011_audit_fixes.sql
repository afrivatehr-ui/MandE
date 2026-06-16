-- =============================================================================
-- Afrivate M&E — Audit fixes: security, app settings, VPI recalc, constraints
-- =============================================================================

-- --- Block non-admins from changing role or email on their profile ------------
create or replace function public.protect_profile_sensitive_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only administrators can change user roles';
    end if;
    if new.email is distinct from old.email then
      new.email := old.email;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists profiles_protect_sensitive on public.profiles;
create trigger profiles_protect_sensitive
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_columns();

-- --- New auth users always start as VIEWER (ignore client metadata role) ------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'VIEWER'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- --- Survey tokens: staff writers only (not viewers) --------------------------
drop policy if exists survey_tokens_read on public.survey_tokens;
create policy survey_tokens_read on public.survey_tokens
  for select to authenticated using (public.is_staff_writer());

-- --- Org-wide app settings (survey link expiry, etc.) -----------------------
create table if not exists public.app_settings (
  id                        int primary key default 1 check (id = 1),
  survey_token_expiry_days  int not null default 14 check (survey_token_expiry_days between 1 and 365),
  updated_at                timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated using (true);

drop policy if exists app_settings_write on public.app_settings;
create policy app_settings_write on public.app_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- Auto-publish surveys whose scheduled time has passed -------------------
create or replace function public.publish_due_surveys()
returns integer language plpgsql security definer set search_path = public as $$
declare
  cnt integer;
begin
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

-- --- VPI section averages: recompute on update too ----------------------------
drop trigger if exists volunteer_surveys_compute_avgs on public.volunteer_surveys;
create trigger volunteer_surveys_compute_avgs
  before insert or update on public.volunteer_surveys
  for each row execute function public.compute_volunteer_survey_avgs();

drop trigger if exists org_surveys_compute_avgs on public.org_surveys;
create trigger org_surveys_compute_avgs
  before insert or update on public.org_surveys
  for each row execute function public.compute_org_survey_avgs();

-- --- Recalc deployment when a survey row is deleted -------------------------
create or replace function public.on_survey_delete()
returns trigger language plpgsql as $$
begin
  update public.survey_tokens
  set used = false
  where deployment_id = old.deployment_id
    and type = (case when tg_table_name = 'org_surveys' then 'org' else 'volunteer' end);
  perform public.recalc_deployment_vpi(old.deployment_id);
  return old;
end; $$;

drop trigger if exists volunteer_surveys_recalc_delete on public.volunteer_surveys;
create trigger volunteer_surveys_recalc_delete
  after delete on public.volunteer_surveys
  for each row execute function public.on_survey_delete();

drop trigger if exists org_surveys_recalc_delete on public.org_surveys;
create trigger org_surveys_recalc_delete
  after delete on public.org_surveys
  for each row execute function public.on_survey_delete();

create or replace function public.on_survey_update()
returns trigger language plpgsql as $$
begin
  perform public.recalc_deployment_vpi(new.deployment_id);
  return new;
end; $$;

drop trigger if exists volunteer_surveys_recalc_update on public.volunteer_surveys;
create trigger volunteer_surveys_recalc_update
  after update on public.volunteer_surveys
  for each row execute function public.on_survey_update();

drop trigger if exists org_surveys_recalc_update on public.org_surveys;
create trigger org_surveys_recalc_update
  after update on public.org_surveys
  for each row execute function public.on_survey_update();

-- --- Custom survey responses: read-only for staff; writes via edge function ---
drop policy if exists survey_responses_write on public.survey_responses;
create policy survey_responses_write on public.survey_responses
  for all to authenticated using (false) with check (false);

-- --- Data integrity constraints ---------------------------------------------
alter table public.deployments drop constraint if exists deployments_dates_check;
alter table public.deployments add constraint deployments_dates_check
  check (end_date >= start_date);

create unique index if not exists profiles_email_lower_idx on public.profiles (lower(email));

-- --- Block edits to archived deployments ------------------------------------
create or replace function public.block_archived_deployment_writes()
returns trigger language plpgsql as $$
begin
  if old.archived_at is not null then
    raise exception 'This deployment has been removed and cannot be changed';
  end if;
  return new;
end; $$;

drop trigger if exists deployments_block_archived_update on public.deployments;
create trigger deployments_block_archived_update
  before update on public.deployments
  for each row execute function public.block_archived_deployment_writes();
