/**
 * Volunteer Performance Index (VPI) - client-side engine (spec Section 5).
 *
 * VPI% = ((taskPerf + professionalism + impact + (overall / 2)) / 4) x 20
 *
 * Dimension scores are 1-5. The overall score (1-10) is halved to normalise to
 * 1-5 before averaging. Result x20 gives a 0-100 percentage.
 *
 * The database trigger (supabase/migrations/..._vpi_trigger.sql) is the source
 * of truth for stored scores; this mirror powers live previews in the survey
 * forms and any client-side display/recompute. Field keys are snake_case to
 * match the database columns and the survey question definitions.
 */

export function calculateVPI({ taskPerf, professionalism, impact, overall10 }) {
  const overallNorm = overall10 / 2
  return ((taskPerf + professionalism + impact + overallNorm) / 4) * 20
}

export function getCategory(vpi) {
  if (vpi >= 80) return 'A'
  if (vpi >= 60) return 'B'
  return 'C'
}

export function getActionFlag(category) {
  const flags = {
    A: 'Retain & Recognise',
    B: 'Develop & Monitor',
    C: 'Urgent Review',
  }
  return flags[category]
}

export function getActionDescription(category) {
  const descriptions = {
    A: 'High Performer - retain, fast-track, and formally recognise.',
    B: 'Developing Performer - monitor and provide structured development support.',
    C: 'Needs Intervention - urgent review, coaching, or re-deployment decision required.',
  }
  return descriptions[category]
}

export function avg(arr) {
  const valid = arr.filter((v) => v !== null && v !== undefined && v !== '')
  return valid.length ? valid.reduce((a, b) => a + Number(b), 0) / valid.length : 0
}

const round2 = (n) => Math.round(n * 100) / 100

// Org effectiveness survey -> section averages + VPI (org-rated, primary score).
export function calcOrgSectionAvgs(s) {
  const taskPerf = avg([
    s.s2_tasks_completed, s.s2_skills_demonstrated, s.s2_deadlines_met,
    s.s2_initiative, s.s2_work_quality, s.s2_minimal_supervision,
  ])
  const professionalism = avg([
    s.s3_professional_behaviour, s.s3_clear_communication,
    s.s3_policy_adherence, s.s3_punctuality, s.s3_team_integration,
  ])
  const impact = avg([
    s.s4_measurable_value, s.s4_mission_support,
    s.s4_irreplaceable_contrib, s.s4_moral_effect,
  ])
  const vpi = calculateVPI({ taskPerf, professionalism, impact, overall10: s.s5_overall_effectiveness })
  return {
    taskPerf: round2(taskPerf),
    professionalism: round2(professionalism),
    impact: round2(impact),
    vpi: round2(vpi),
  }
}

// Volunteer self-report survey -> section averages + VPI (proxy dimensions).
export function calcVolSectionAvgs(s) {
  const onboarding = avg([
    s.s2_clear_briefing, s.s2_felt_welcome, s.s2_tools_available,
    s.s2_afrivate_support, s.s2_knew_who_to_contact,
  ])
  const workExp = avg([
    s.s3_skills_matched, s.s3_meaningful_impact, s.s3_appropriate_responsibility,
    s.s3_manageable_workload, s.s3_useful_feedback, s.s3_learning_opportunities,
  ])
  const orgEnv = avg([
    s.s4_inclusive_culture, s.s4_safe_environment,
    s.s4_collaborative_staff, s.s4_clear_communication,
  ])
  const vpi = calculateVPI({
    taskPerf: workExp,
    professionalism: onboarding,
    impact: orgEnv,
    overall10: s.s5_overall_satisfaction,
  })
  return {
    onboarding: round2(onboarding),
    workExp: round2(workExp),
    orgEnv: round2(orgEnv),
    vpi: round2(vpi),
  }
}

// Brand colour for a VPI category (status colours, used sparingly per brand rules).
export function categoryColor(category) {
  return { A: '#317D34', B: '#EFDA0E', C: '#EB1111' }[category] ?? '#8D4087'
}
