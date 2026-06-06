-- =============================================================================
-- Deployments always link a volunteer AND an organisation (context for surveys).
-- Survey target (volunteer / org / both) controls which emails are sent, not
-- which parties are recorded on the deployment.
-- =============================================================================

alter table public.deployments drop constraint if exists deployments_party_check;
alter table public.deployments add constraint deployments_party_check
  check (volunteer_id is not null and organisation_id is not null);
