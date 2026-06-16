-- Access requests without pre-created auth users; org contact role on deployments.

-- Allow access requests before an auth account exists (admin creates user on approve).
alter table public.access_requests alter column user_id drop not null;

-- One pending request per email at a time.
create unique index if not exists access_requests_pending_email_idx
  on public.access_requests (lower(email))
  where status = 'PENDING';

-- Organisation contact job title (persistent on org record).
alter table public.organisations
  add column if not exists contact_title text;

-- Organisation contact role for this specific deployment context.
alter table public.deployments
  add column if not exists org_contact_role text;
