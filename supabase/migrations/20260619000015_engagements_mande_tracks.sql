-- =============================================================================
-- Afrivate M&E — Past engagements, hours served, internal vs external M&E tracks
-- =============================================================================

do $$ begin
  create type public.mande_track as enum ('internal', 'external');
exception when duplicate_object then null; end $$;

-- --- Hours on live deployments + M&E track ----------------------------------
alter table public.deployments
  add column if not exists mande_track public.mande_track not null default 'internal';

alter table public.deployments
  add column if not exists hours_served numeric check (hours_served is null or hours_served >= 0);

comment on column public.deployments.mande_track is
  'internal = Afrivate evaluation only; external = media/publication-ready surveys and scoring';

comment on column public.deployments.hours_served is
  'Volunteer hours for this placement (used in certificates and total-hours badges)';

-- --- Historical / past engagements (no live survey workflow) ------------------
create table if not exists public.volunteer_engagements (
  id                uuid primary key default gen_random_uuid(),
  volunteer_id      uuid not null references public.volunteers (id) on delete cascade,
  organisation_name text not null,
  role_title        text,
  start_date        date not null,
  end_date          date not null,
  hours_served      numeric not null check (hours_served > 0),
  mande_track       public.mande_track not null default 'internal',
  notes             text,
  created_at        timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists volunteer_engagements_vol_idx
  on public.volunteer_engagements (volunteer_id);

alter table public.volunteer_engagements enable row level security;

drop policy if exists volunteer_engagements_read on public.volunteer_engagements;
create policy volunteer_engagements_read on public.volunteer_engagements
  for select to authenticated using (true);

drop policy if exists volunteer_engagements_write on public.volunteer_engagements;
create policy volunteer_engagements_write on public.volunteer_engagements
  for all to authenticated
  using (public.is_staff_writer())
  with check (public.is_staff_writer());

-- --- Total volunteer hours (deployments + past engagements) -------------------
create or replace function public.volunteer_total_hours(p_volunteer_id uuid)
returns numeric language sql stable as $$
  select coalesce(
    (
      select sum(e.hours_served)
      from public.volunteer_engagements e
      where e.volunteer_id = p_volunteer_id
    ),
    0
  ) + coalesce(
    (
      select sum(d.hours_served)
      from public.deployments d
      where d.volunteer_id = p_volunteer_id
        and d.archived_at is null
        and d.hours_served is not null
    ),
    0
  );
$$;

grant execute on function public.volunteer_total_hours(uuid) to authenticated;

-- --- Track on built-in survey registry --------------------------------------
alter table public.surveys
  add column if not exists mande_track public.mande_track;

update public.surveys
set mande_track = 'internal'
where is_builtin and mande_track is null;

-- External built-in instruments (media/publication questionnaire set)
insert into public.surveys (key, title, description, is_builtin, status, mande_track)
values
  (
    'volunteer_external',
    'Volunteer experience (External / Media)',
    'External-facing volunteer feedback for media and publication. Distinct from the internal Afrivate evaluation survey.',
    true,
    'PUBLISHED',
    'external'
  ),
  (
    'org_external',
    'Organisation assessment (External / Media)',
    'External-facing partner assessment for media and publication. Distinct from the internal Afrivate evaluation survey.',
    true,
    'PUBLISHED',
    'external'
  )
on conflict (key) do update set
  title = excluded.title,
  description = excluded.description,
  mande_track = excluded.mande_track,
  status = excluded.status;
