-- =============================================================================
-- Afrivate M&E - Access requests (signup approval workflow)
--
-- Referenced by RLS (migration 002) and the Signup / Settings pages but was
-- missing from the original schema. Staff request access via /signup; admins
-- approve or reject in Settings.
-- =============================================================================

create table if not exists public.access_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  email           text not null,
  name            text not null,
  organisation    text,
  role_requested  role not null default 'VIEWER',
  status          text not null default 'PENDING'
                    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists access_requests_user_idx on public.access_requests (user_id);
create index if not exists access_requests_status_idx on public.access_requests (status);

alter table public.access_requests enable row level security;

drop policy if exists access_requests_read on public.access_requests;
create policy access_requests_read on public.access_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists access_requests_admin_update on public.access_requests;
create policy access_requests_admin_update on public.access_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists access_requests_user_insert on public.access_requests;
create policy access_requests_user_insert on public.access_requests
  for insert to authenticated
  with check (user_id = auth.uid());
