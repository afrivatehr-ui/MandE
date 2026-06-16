-- =============================================================================
-- Afrivate M&E - Row Level Security
-- Model (spec Section 2):
--   ADMIN  - full access incl. user management
--   HR     - read all + write volunteer/org/deployment/token data
--   VIEWER - read-only
-- Anonymous survey respondents never touch tables directly; the public
-- `surveys` Edge Function uses the service-role key (bypasses RLS).
-- =============================================================================

-- Helper: current user's role, SECURITY DEFINER to avoid recursive RLS on profiles.
-- (Named current_user_role to avoid clashing with Postgres's built-in current_role.)
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff_writer()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('ADMIN', 'HR'), false);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'ADMIN', false);
$$;

-- --- Enable RLS --------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.volunteers      enable row level security;
alter table public.organisations   enable row level security;
alter table public.deployments     enable row level security;
alter table public.volunteer_surveys enable row level security;
alter table public.org_surveys     enable row level security;
alter table public.survey_tokens   enable row level security;
-- access_requests RLS is enabled in migration 006 when the table is created.

-- --- Profiles ----------------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- --- Shared read-for-all-staff / write-for-ADMIN+HR pattern ------------------
-- volunteers
drop policy if exists volunteers_read on public.volunteers;
create policy volunteers_read on public.volunteers
  for select to authenticated using (true);
drop policy if exists volunteers_write on public.volunteers;
create policy volunteers_write on public.volunteers
  for all to authenticated using (public.is_staff_writer()) with check (public.is_staff_writer());

-- organisations
drop policy if exists organisations_read on public.organisations;
create policy organisations_read on public.organisations
  for select to authenticated using (true);
drop policy if exists organisations_write on public.organisations;
create policy organisations_write on public.organisations
  for all to authenticated using (public.is_staff_writer()) with check (public.is_staff_writer());

-- deployments
drop policy if exists deployments_read on public.deployments;
create policy deployments_read on public.deployments
  for select to authenticated using (true);
drop policy if exists deployments_write on public.deployments;
create policy deployments_write on public.deployments
  for all to authenticated using (public.is_staff_writer()) with check (public.is_staff_writer());

-- survey_tokens (creation normally happens through the email Edge Function /
-- service role, but allow ADMIN+HR to manage from the app too)
drop policy if exists survey_tokens_read on public.survey_tokens;
create policy survey_tokens_read on public.survey_tokens
  for select to authenticated using (true);
drop policy if exists survey_tokens_write on public.survey_tokens;
create policy survey_tokens_write on public.survey_tokens
  for all to authenticated using (public.is_staff_writer()) with check (public.is_staff_writer());

-- volunteer_surveys / org_surveys: staff read-only in the app
-- (writes come from the service-role Edge Function on public submission).
drop policy if exists volunteer_surveys_read on public.volunteer_surveys;
create policy volunteer_surveys_read on public.volunteer_surveys
  for select to authenticated using (true);

drop policy if exists org_surveys_read on public.org_surveys;
create policy org_surveys_read on public.org_surveys
  for select to authenticated using (true);

-- access_requests policies: see migration 006_access_requests.sql
