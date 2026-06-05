-- =============================================================================
-- Afrivate M&E - Seed data (spec Section 15: 1 ADMIN, 2 volunteers, 2 orgs,
-- 3 deployments with surveys). Idempotent via fixed UUIDs + ON CONFLICT.
-- Triggers compute survey averages and deployment VPI automatically.
-- =============================================================================

-- --- Admin user --------------------------------------------------------------
-- Creates a login: admin@afrivate.com / Afrivate2026!  (CHANGE after first login)
-- If your project's auth schema differs and this errors, create the user from the
-- Supabase dashboard (Authentication -> Add user), then:
--   update public.profiles set role = 'ADMIN' where email = 'you@afrivate.com';
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'admin@afrivate.com';
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      'admin@afrivate.com', crypt('Afrivate2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"M&E Admin","role":"ADMIN"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid,
      json_build_object('sub', v_uid::text, 'email', 'admin@afrivate.com'),
      'email', 'admin@afrivate.com', now(), now(), now()
    );
  end if;
  -- Ensure the profile exists with ADMIN role regardless of trigger timing.
  insert into public.profiles (id, email, name, role)
  values (v_uid, 'admin@afrivate.com', 'M&E Admin', 'ADMIN')
  on conflict (id) do update set role = 'ADMIN', name = excluded.name;
end $$;

-- --- Organisations -----------------------------------------------------------
insert into public.organisations (id, name, contact_name, contact_email, sector) values
  ('11111111-1111-1111-1111-111111111101', 'Hope Health Initiative', 'Dr. Ngozi Eze', 'ngozi@hopehealth.org', 'Health'),
  ('11111111-1111-1111-1111-111111111102', 'Lagos Tech Hub', 'Bola Adeyemi', 'bola@lagostechhub.com', 'Technology')
on conflict (id) do nothing;

-- --- Volunteers --------------------------------------------------------------
insert into public.volunteers (id, volunteer_id, full_name, email, phone) values
  ('22222222-2222-2222-2222-222222222201', 'AV-2026-001', 'Amara Okafor', 'amara.okafor@example.com', '+2348030000001'),
  ('22222222-2222-2222-2222-222222222202', 'AV-2026-002', 'Tunde Balogun', 'tunde.balogun@example.com', '+2348030000002')
on conflict (id) do nothing;

-- --- Deployments -------------------------------------------------------------
insert into public.deployments (id, volunteer_id, organisation_id, role_title, start_date, end_date, status) values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'Community Health Data Analyst', '2026-01-06', '2026-03-28', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'Frontend Engineering Volunteer', '2026-01-13', '2026-04-04', 'ACTIVE'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111102', 'Product Research Volunteer', '2026-02-03', '2026-04-25', 'ACTIVE')
on conflict (id) do nothing;

-- --- Survey tokens (already used; for realistic deployments view) ------------
insert into public.survey_tokens (deployment_id, type, used, expires_at) values
  ('33333333-3333-3333-3333-333333333301', 'volunteer', true, now() + interval '14 days'),
  ('33333333-3333-3333-3333-333333333301', 'org', true, now() + interval '14 days'),
  ('33333333-3333-3333-3333-333333333302', 'volunteer', true, now() + interval '14 days'),
  ('33333333-3333-3333-3333-333333333302', 'org', true, now() + interval '14 days'),
  ('33333333-3333-3333-3333-333333333303', 'volunteer', true, now() + interval '14 days'),
  ('33333333-3333-3333-3333-333333333303', 'org', true, now() + interval '14 days')
on conflict (deployment_id, type) do nothing;

-- --- Volunteer surveys -------------------------------------------------------
insert into public.volunteer_surveys (
  deployment_id,
  s2_clear_briefing, s2_felt_welcome, s2_tools_available, s2_afrivate_support, s2_knew_who_to_contact,
  s3_skills_matched, s3_meaningful_impact, s3_appropriate_responsibility, s3_manageable_workload, s3_useful_feedback, s3_learning_opportunities,
  s4_inclusive_culture, s4_safe_environment, s4_collaborative_staff, s4_clear_communication,
  s5_overall_satisfaction, s5_nps_score, s5_volunteer_again,
  s6_org_strengths, s6_org_improvements, s6_afrivate_improvements, s6_other_comments
) values
  ('33333333-3333-3333-3333-333333333301',
   5,5,4,5,5,  5,5,4,5,4,5,  5,5,4,5,  9,9,'Yes, definitely',
   'Supportive supervisors and a clear mission.', 'Faster onboarding paperwork.', 'More frequent check-ins mid-deployment.', 'A genuinely rewarding placement.'),
  ('33333333-3333-3333-3333-333333333302',
   4,4,3,4,3,  4,3,4,3,4,3,  4,3,4,3,  7,7,'Yes, with reservations',
   'Good exposure to real engineering work.', 'Clearer task prioritisation.', 'Better skills-to-role matching.', null),
  ('33333333-3333-3333-3333-333333333303',
   3,2,3,2,3,  3,2,3,2,3,2,  3,2,3,2,  5,4,'Unsure',
   'Friendly team.', 'Define the role scope before arrival.', 'Confirm the assignment exists before deployment.', 'Felt under-utilised.')
on conflict (deployment_id) do nothing;

-- --- Org surveys (these set the primary deployment VPI: A / B / C) -----------
insert into public.org_surveys (
  deployment_id, supervisor_name, supervisor_title,
  s2_tasks_completed, s2_skills_demonstrated, s2_deadlines_met, s2_initiative, s2_work_quality, s2_minimal_supervision,
  s3_professional_behaviour, s3_clear_communication, s3_policy_adherence, s3_punctuality, s3_team_integration,
  s4_measurable_value, s4_mission_support, s4_irreplaceable_contrib, s4_moral_effect,
  s5_overall_effectiveness, s5_request_again, s5_request_same_vol,
  s6_strengths, s6_improvements, s6_afrivate_improvements, s6_other_feedback
) values
  ('33333333-3333-3333-3333-333333333301', 'Dr. Ngozi Eze', 'Programme Director',
   5,5,4,5,5,4,  5,5,4,5,4,  5,4,5,4,  9,'Yes, definitely','Yes',
   'Exceptional analytical skills and ownership.', 'Could delegate more.', 'Keep matching this calibre of volunteer.', 'A standout contributor.'),
  ('33333333-3333-3333-3333-333333333302', 'Bola Adeyemi', 'Engineering Lead',
   4,3,4,3,4,3,  4,3,3,4,3,  3,4,3,4,  7,'Yes, with requirements','Unsure',
   'Reliable and willing to learn.', 'Needs to ask for help sooner.', 'Pre-screen technical depth.', null),
  ('33333333-3333-3333-3333-333333333303', 'Bola Adeyemi', 'Engineering Lead',
   3,2,3,2,3,2,  2,3,2,3,2,  3,2,3,2,  5,'Unsure','No',
   'Polite and punctual.', 'Significant skills gap for the role.', 'Improve role/skill matching at intake.', 'Role scope was unclear from the start.')
on conflict (deployment_id) do nothing;
