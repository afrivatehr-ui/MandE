-- =============================================================================
-- Afrivate M&E — Audit #4 fixes: service-role profile updates, builtin survey
-- protection, volunteer hours map for list views
-- =============================================================================

-- Allow edge functions (service role) to update profile role/email
create or replace function public.protect_profile_sensitive_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;
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

-- Block tampering with built-in survey registry rows (key / is_builtin)
create or replace function public.protect_builtin_survey()
returns trigger language plpgsql as $$
begin
  if old.is_builtin then
    if new.is_builtin is distinct from old.is_builtin then
      raise exception 'Built-in surveys cannot be modified';
    end if;
    if new.key is distinct from old.key then
      raise exception 'Built-in survey keys cannot be changed';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists surveys_protect_builtin on public.surveys;
create trigger surveys_protect_builtin
  before update on public.surveys
  for each row execute function public.protect_builtin_survey();

-- Total hours per volunteer (deployments + past engagements) for list views
create or replace function public.volunteer_hours_map()
returns table (volunteer_id uuid, total_hours numeric)
language sql stable security definer set search_path = public as $$
  select
    v.id,
    coalesce((
      select sum(d.hours_served)
      from public.deployments d
      where d.volunteer_id = v.id
        and d.archived_at is null
        and d.hours_served is not null
    ), 0)
    + coalesce((
      select sum(e.hours_served)
      from public.volunteer_engagements e
      where e.volunteer_id = v.id
    ), 0)
  from public.volunteers v
  where v.archived_at is null;
$$;

grant execute on function public.volunteer_hours_map() to authenticated;
