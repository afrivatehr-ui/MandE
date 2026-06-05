-- =============================================================================
-- Afrivate M&E - Survey instruments (lifecycle layer)
--
-- The platform runs two fixed survey instruments (volunteer self-report and
-- organisation feedback). Their questions live in the app config and map to the
-- volunteer_surveys / org_surveys response tables (and the VPI engine).
--
-- This table adds a manageable lifecycle on top of those instruments so staff
-- can draft, schedule, publish and close each survey, and so the Surveys page
-- has a real "survey" entity to list and edit.
-- =============================================================================

do $$ begin
  create type survey_status as enum ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED');
exception when duplicate_object then null; end $$;

create table if not exists public.surveys (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique check (key in ('volunteer', 'org')),
  title               text not null,
  description         text,
  status              survey_status not null default 'DRAFT',
  scheduled_at        timestamptz,       -- when status = SCHEDULED, the planned go-live
  published_at        timestamptz,       -- first time the survey was published
  closed_at           timestamptz,       -- when status = CLOSED
  default_expiry_days int not null default 14 check (default_expiry_days between 1 and 365),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists surveys_set_updated_at on public.surveys;
create trigger surveys_set_updated_at before update on public.surveys
  for each row execute function public.set_updated_at();

-- Seed the two live instruments. They are already collecting responses in
-- production, so they start PUBLISHED.
insert into public.surveys (key, title, description, status, published_at)
values
  (
    'volunteer',
    'Volunteer Self-Report Survey',
    'Completed by volunteers at the end of a deployment to capture their onboarding experience, work experience, satisfaction and open feedback.',
    'PUBLISHED',
    now()
  ),
  (
    'org',
    'Organisation Feedback Survey',
    'Completed by the partner organisation''s supervisor to assess the volunteer''s task performance, professionalism and organisational impact.',
    'PUBLISHED',
    now()
  )
on conflict (key) do nothing;

-- --- RLS: all staff read, ADMIN + HR write -----------------------------------
alter table public.surveys enable row level security;

drop policy if exists surveys_read on public.surveys;
create policy surveys_read on public.surveys
  for select to authenticated using (true);

drop policy if exists surveys_write on public.surveys;
create policy surveys_write on public.surveys
  for all to authenticated using (public.is_staff_writer()) with check (public.is_staff_writer());
