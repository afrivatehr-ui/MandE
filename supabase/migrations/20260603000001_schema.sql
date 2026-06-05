-- =============================================================================
-- Afrivate M&E - Schema (translated from the Prisma models in the spec, Section 4)
-- Postgres / Supabase. Column names are snake_case (PostgREST / supabase-js).
-- =============================================================================

create extension if not exists "pgcrypto";

-- --- Enums -------------------------------------------------------------------
do $$ begin
  create type role as enum ('ADMIN', 'HR', 'VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deployment_status as enum ('ACTIVE', 'COMPLETED', 'AWAITING_SURVEYS', 'SURVEYS_COMPLETE');
exception when duplicate_object then null; end $$;

-- --- Profiles (staff users; mirrors auth.users) ------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null,
  role        role not null default 'VIEWER',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --- Volunteers --------------------------------------------------------------
create table if not exists public.volunteers (
  id            uuid primary key default gen_random_uuid(),
  volunteer_id  text not null unique,            -- e.g. AV-2026-001
  full_name     text not null,
  email         text not null,
  phone         text,
  created_at    timestamptz not null default now()
);

-- --- Organisations -----------------------------------------------------------
create table if not exists public.organisations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  contact_name   text,
  contact_email  text,
  sector         text,
  created_at     timestamptz not null default now()
);

-- --- Deployments -------------------------------------------------------------
create table if not exists public.deployments (
  id               uuid primary key default gen_random_uuid(),
  volunteer_id     uuid not null references public.volunteers (id) on delete cascade,
  organisation_id  uuid not null references public.organisations (id) on delete cascade,
  role_title       text not null,
  start_date       date not null,
  end_date         date not null,
  status           deployment_status not null default 'ACTIVE',
  vpi_score        numeric,        -- auto-calculated by trigger once both surveys exist
  vpi_category     text,           -- 'A' | 'B' | 'C'
  action_flag      text,           -- 'Retain & Recognise' | 'Develop & Monitor' | 'Urgent Review'
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists deployments_volunteer_idx on public.deployments (volunteer_id);
create index if not exists deployments_org_idx on public.deployments (organisation_id);
create index if not exists deployments_status_idx on public.deployments (status);

-- --- Volunteer self-report survey -------------------------------------------
create table if not exists public.volunteer_surveys (
  id            uuid primary key default gen_random_uuid(),
  deployment_id uuid not null unique references public.deployments (id) on delete cascade,
  submitted_at  timestamptz not null default now(),

  -- Section 2: Onboarding & Support (1-5)
  s2_clear_briefing     int not null,
  s2_felt_welcome       int not null,
  s2_tools_available    int not null,
  s2_afrivate_support   int not null,
  s2_knew_who_to_contact int not null,

  -- Section 3: Work Experience (1-5)
  s3_skills_matched              int not null,
  s3_meaningful_impact           int not null,
  s3_appropriate_responsibility  int not null,
  s3_manageable_workload         int not null,
  s3_useful_feedback             int not null,
  s3_learning_opportunities      int not null,

  -- Section 4: Organisational Environment (1-5)
  s4_inclusive_culture    int not null,
  s4_safe_environment     int not null,
  s4_collaborative_staff  int not null,
  s4_clear_communication  int not null,

  -- Section 5: Overall
  s5_overall_satisfaction int not null,   -- 1-10
  s5_nps_score            int not null,    -- 0-10
  s5_volunteer_again      text not null,

  -- Section 6: Open feedback
  s6_org_strengths          text,
  s6_org_improvements       text,
  s6_afrivate_improvements  text,
  s6_other_comments         text,

  -- Calculated section averages (filled by trigger)
  onboarding_avg  numeric,
  work_exp_avg    numeric,
  org_env_avg     numeric,
  volunteer_vpi   numeric
);

-- --- Organisation effectiveness survey --------------------------------------
create table if not exists public.org_surveys (
  id              uuid primary key default gen_random_uuid(),
  deployment_id   uuid not null unique references public.deployments (id) on delete cascade,
  submitted_at    timestamptz not null default now(),
  supervisor_name  text not null,
  supervisor_title text not null,

  -- Section 2: Task Performance (1-5)
  s2_tasks_completed     int not null,
  s2_skills_demonstrated int not null,
  s2_deadlines_met       int not null,
  s2_initiative          int not null,
  s2_work_quality        int not null,
  s2_minimal_supervision int not null,

  -- Section 3: Professionalism & Conduct (1-5)
  s3_professional_behaviour int not null,
  s3_clear_communication    int not null,
  s3_policy_adherence       int not null,
  s3_punctuality            int not null,
  s3_team_integration       int not null,

  -- Section 4: Impact & Organisational Value (1-5)
  s4_measurable_value      int not null,
  s4_mission_support       int not null,
  s4_irreplaceable_contrib int not null,
  s4_moral_effect          int not null,

  -- Section 5: Overall Assessment
  s5_overall_effectiveness int not null,  -- 1-10
  s5_request_again         text not null,
  s5_request_same_vol      text not null,

  -- Section 6: Open feedback
  s6_strengths             text,
  s6_improvements          text,
  s6_afrivate_improvements text,
  s6_other_feedback        text,

  -- Calculated section averages (filled by trigger)
  task_perf_avg       numeric,
  professionalism_avg numeric,
  impact_avg          numeric,
  org_vpi             numeric
);

-- --- Survey tokens -----------------------------------------------------------
-- New table (not in original Prisma): tokens must exist at deployment-creation
-- time, before any survey row exists.
create table if not exists public.survey_tokens (
  id            uuid primary key default gen_random_uuid(),
  token         uuid not null unique default gen_random_uuid(),
  deployment_id uuid not null references public.deployments (id) on delete cascade,
  type          text not null check (type in ('volunteer', 'org')),
  used          boolean not null default false,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  unique (deployment_id, type)
);

create index if not exists survey_tokens_token_idx on public.survey_tokens (token);

-- --- updated_at maintenance --------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists deployments_set_updated_at on public.deployments;
create trigger deployments_set_updated_at before update on public.deployments
  for each row execute function public.set_updated_at();

-- --- Auto-create a profile when a new auth user is created -------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::role, 'VIEWER')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
