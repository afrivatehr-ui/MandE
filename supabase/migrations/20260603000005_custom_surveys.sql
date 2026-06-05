-- =============================================================================
-- Afrivate M&E - Custom surveys
--
-- Extends the surveys table so staff can author their own standalone surveys
-- (in addition to the two built-in, VPI-scored instruments). Custom surveys:
--   * store their question structure in `definition` (same shape as the
--     built-in config: likertSections / overall.sliders / overall.radios /
--     feedback.fields), so the existing SurveyFlow renderer can run them;
--   * collect responses in the generic `survey_responses` table (JSONB);
--   * are shared via a public link (/survey/custom/:id) — no deployment needed;
--   * do NOT feed the VPI engine.
-- Built-in surveys (volunteer/org) keep using their fixed response tables.
-- =============================================================================

-- Allow custom keys (the original check restricted key to volunteer/org).
alter table public.surveys drop constraint if exists surveys_key_check;

alter table public.surveys
  add column if not exists is_builtin boolean not null default false,
  add column if not exists audience    text,
  add column if not exists definition  jsonb not null default '{}'::jsonb,
  add column if not exists created_by   uuid;

-- The two seeded instruments are built-in and protected.
update public.surveys set is_builtin = true where key in ('volunteer', 'org');

-- --- Generic responses for custom surveys -----------------------------------
create table if not exists public.survey_responses (
  id               uuid primary key default gen_random_uuid(),
  survey_id        uuid not null references public.surveys (id) on delete cascade,
  respondent_name  text,
  respondent_email text,
  answers          jsonb not null default '{}'::jsonb,
  submitted_at     timestamptz not null default now()
);
create index if not exists survey_responses_survey_idx on public.survey_responses (survey_id);

alter table public.survey_responses enable row level security;

drop policy if exists survey_responses_read on public.survey_responses;
create policy survey_responses_read on public.survey_responses
  for select to authenticated using (true);

drop policy if exists survey_responses_write on public.survey_responses;
create policy survey_responses_write on public.survey_responses
  for all to authenticated using (public.is_staff_writer()) with check (public.is_staff_writer());
-- (Anonymous public submissions are inserted by the `surveys` Edge Function
--  using the service-role key, which bypasses RLS.)

-- --- Protect built-in surveys from deletion ---------------------------------
create or replace function public.prevent_builtin_survey_delete()
returns trigger language plpgsql as $$
begin
  if old.is_builtin then
    raise exception 'Built-in surveys cannot be deleted.';
  end if;
  return old;
end; $$;

drop trigger if exists surveys_no_builtin_delete on public.surveys;
create trigger surveys_no_builtin_delete before delete on public.surveys
  for each row execute function public.prevent_builtin_survey_delete();
