-- =============================================================================
-- Afrivate M&E — Audit follow-up 2: survey insert triggers + access request RLS
-- =============================================================================

-- Ensure AFTER INSERT triggers exist (idempotent — migration 011 added update/delete
-- but did not touch the original insert triggers from 003; this guards fresh installs).
drop trigger if exists volunteer_surveys_recalc on public.volunteer_surveys;
create trigger volunteer_surveys_recalc
  after insert on public.volunteer_surveys
  for each row execute function public.on_survey_insert();

drop trigger if exists org_surveys_recalc on public.org_surveys;
create trigger org_surveys_recalc
  after insert on public.org_surveys
  for each row execute function public.on_survey_insert();

-- Access requests must go through the request-access edge function (rate limits,
-- ADMIN role block, duplicate checks). Direct authenticated INSERT bypasses those.
drop policy if exists access_requests_user_insert on public.access_requests;
