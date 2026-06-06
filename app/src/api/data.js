import { supabase } from '../lib/supabase'
import { VOLUNTEER_SURVEY, ORG_SURVEY } from '../config/surveyQuestions'

// PostgREST returns embedded one-to-one relations as an object or a single-item
// array depending on detection; normalise to a single object or null.
function one(rel) {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
}

const DEPLOYMENT_SELECT = `
  id, role_title, start_date, end_date, status, vpi_score, vpi_category, action_flag, survey_target, archived_at, created_at, updated_at,
  volunteer_id, organisation_id,
  volunteers ( id, volunteer_id, full_name, email, archived_at ),
  organisations ( id, name, sector, archived_at ),
  survey_tokens ( type, token, used, expires_at ),
  volunteer_surveys ( id, submitted_at, volunteer_vpi, onboarding_avg, work_exp_avg, org_env_avg,
    s5_overall_satisfaction, s5_nps_score, s5_volunteer_again ),
  org_surveys ( id, submitted_at, supervisor_name, supervisor_title, task_perf_avg, professionalism_avg, impact_avg, org_vpi,
    s5_overall_effectiveness, s5_request_again, s5_request_same_vol,
    s6_strengths, s6_improvements )
`

// Fuller select for detail pages (complete survey answers for expandable views).
const DEPLOYMENT_DETAIL_SELECT = `
  id, role_title, start_date, end_date, status, vpi_score, vpi_category, action_flag, created_at, updated_at,
  volunteer_id, organisation_id,
  volunteers ( id, volunteer_id, full_name, email, phone ),
  organisations ( id, name, sector, contact_name, contact_email ),
  volunteer_surveys ( * ),
  org_surveys ( * )
`

function isSurveyRow(row) {
  return Boolean(row && typeof row === 'object' && row.id)
}

function inferSurveyTarget(surveyTarget, tokens) {
  if (surveyTarget) return surveyTarget
  const hasV = Boolean(tokens.volunteer)
  const hasO = Boolean(tokens.org)
  if (hasV && hasO) return 'both'
  if (hasV) return 'volunteer'
  if (hasO) return 'organisation'
  return 'both'
}

function normaliseDeployment(d, volSurveyOverride, orgSurveyOverride) {
  const vol = one(d.volunteers)
  const org = one(d.organisations)
  const volSurvey = volSurveyOverride ?? one(d.volunteer_surveys)
  const orgSurvey = orgSurveyOverride ?? one(d.org_surveys)
  const tokenList = Array.isArray(d.survey_tokens) ? d.survey_tokens : []
  const tokens = {}
  const tokenUsed = {}
  for (const t of tokenList) {
    tokens[t.type] = t.token
    tokenUsed[t.type] = Boolean(t.used)
  }
  const surveyTarget = inferSurveyTarget(d.survey_target, tokens)
  const needsVolunteerSurvey = surveyTarget === 'volunteer' || surveyTarget === 'both'
  const needsOrganisationSurvey = surveyTarget === 'organisation' || surveyTarget === 'both'
  const hasVolunteer = Boolean(d.volunteer_id)
  const hasOrganisation = Boolean(d.organisation_id)
  return {
    ...d,
    tokens,
    tokenUsed,
    surveyTarget,
    needsVolunteerSurvey,
    needsOrganisationSurvey,
    volunteer: vol,
    organisation: org,
    volunteerArchived: Boolean(vol?.archived_at),
    organisationArchived: Boolean(org?.archived_at),
    volSurvey: isSurveyRow(volSurvey) ? volSurvey : null,
    orgSurvey: isSurveyRow(orgSurvey) ? orgSurvey : null,
    hasVolunteer,
    hasOrganisation,
    volunteerName: vol?.full_name ?? '—',
    volunteerCode: vol?.volunteer_id ?? '—',
    orgName: org?.name ?? '—',
    volSubmitted: isSurveyRow(volSurvey) || (needsVolunteerSurvey && tokenUsed.volunteer),
    orgSubmitted: isSurveyRow(orgSurvey) || (needsOrganisationSurvey && tokenUsed.org),
    task: orgSurvey?.task_perf_avg ?? null,
    prof: orgSurvey?.professionalism_avg ?? null,
    impact: orgSurvey?.impact_avg ?? null,
    overall: orgSurvey?.s5_overall_effectiveness ?? null,
    vpi: d.vpi_score,
    category: d.vpi_category,
  }
}

async function loadSurveyRowsByDeployment(ids) {
  if (!ids.length) return { volByDep: new Map(), orgByDep: new Map() }
  const [{ data: volRows, error: volErr }, { data: orgRows, error: orgErr }] = await Promise.all([
    supabase.from('volunteer_surveys').select('deployment_id, id, submitted_at, volunteer_vpi, onboarding_avg, work_exp_avg, org_env_avg, s5_overall_satisfaction, s5_nps_score, s5_volunteer_again').in('deployment_id', ids),
    supabase.from('org_surveys').select('deployment_id, id, submitted_at, supervisor_name, supervisor_title, task_perf_avg, professionalism_avg, impact_avg, org_vpi, s5_overall_effectiveness, s5_request_again, s5_request_same_vol, s6_strengths, s6_improvements, s6_other_feedback, s6_afrivate_improvements').in('deployment_id', ids),
  ])
  if (volErr) throw volErr
  if (orgErr) throw orgErr
  const volByDep = new Map((volRows ?? []).map((r) => [r.deployment_id, r]))
  const orgByDep = new Map((orgRows ?? []).map((r) => [r.deployment_id, r]))
  return { volByDep, orgByDep }
}

// Full survey rows for detail pages (all Likert / feedback columns).
async function loadFullSurveyRowsByDeployment(ids) {
  if (!ids.length) return { volByDep: new Map(), orgByDep: new Map() }
  const [{ data: volRows, error: volErr }, { data: orgRows, error: orgErr }] = await Promise.all([
    supabase.from('volunteer_surveys').select('*').in('deployment_id', ids),
    supabase.from('org_surveys').select('*').in('deployment_id', ids),
  ])
  if (volErr) throw volErr
  if (orgErr) throw orgErr
  const volByDep = new Map((volRows ?? []).map((r) => [r.deployment_id, r]))
  const orgByDep = new Map((orgRows ?? []).map((r) => [r.deployment_id, r]))
  return { volByDep, orgByDep }
}

export async function fetchDeployments({ activeOnly = true } = {}) {
  let query = supabase
    .from('deployments')
    .select(DEPLOYMENT_SELECT)
    .order('created_at', { ascending: false })
  if (activeOnly) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw error
  if (!data?.length) return []
  const ids = data.map((d) => d.id)
  const { volByDep, orgByDep } = await loadSurveyRowsByDeployment(ids)
  return data.map((d) =>
    normaliseDeployment(d, volByDep.get(d.id), orgByDep.get(d.id)),
  )
}

export async function fetchVolunteers() {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .is('archived_at', null)
    .order('full_name')
  if (error) throw error
  return data
}

export async function fetchOrganisations() {
  const { data, error } = await supabase
    .from('organisations')
    .select('*')
    .is('archived_at', null)
    .order('name')
  if (error) throw error
  return data
}

export async function fetchVolunteer(id) {
  const { data, error } = await supabase.from('volunteers').select('*').eq('id', id).single()
  if (error) throw error
  const { data: deps, error: depErr } = await supabase
    .from('deployments')
    .select(DEPLOYMENT_DETAIL_SELECT)
    .eq('volunteer_id', id)
    .order('start_date', { ascending: false })
  if (depErr) throw depErr
  const ids = (deps ?? []).map((d) => d.id)
  const { volByDep, orgByDep } = await loadFullSurveyRowsByDeployment(ids)
  return {
    volunteer: data,
    deployments: (deps ?? []).map((d) =>
      normaliseDeployment(d, volByDep.get(d.id), orgByDep.get(d.id)),
    ),
  }
}

export async function fetchOrganisation(id) {
  const { data, error } = await supabase.from('organisations').select('*').eq('id', id).single()
  if (error) throw error
  const { data: deps, error: depErr } = await supabase
    .from('deployments')
    .select(DEPLOYMENT_DETAIL_SELECT)
    .eq('organisation_id', id)
    .order('start_date', { ascending: false })
  if (depErr) throw depErr
  const ids = (deps ?? []).map((d) => d.id)
  const { volByDep, orgByDep } = await loadFullSurveyRowsByDeployment(ids)
  return {
    organisation: data,
    deployments: (deps ?? []).map((d) =>
      normaliseDeployment(d, volByDep.get(d.id), orgByDep.get(d.id)),
    ),
  }
}

// --- Mutations ---------------------------------------------------------------
export async function createVolunteer(payload) {
  const { data, error } = await supabase.from('volunteers').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function createOrganisation(payload) {
  const { data, error } = await supabase.from('organisations').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function createDeployment(payload) {
  const { data, error } = await supabase.from('deployments').insert(payload).select().single()
  if (error) throw error
  return data
}

// Generate survey tokens for the requested party types. Idempotent.
export async function createSurveyTokens(deploymentId, endDate, expiresDays = 14, types = ['volunteer', 'org']) {
  const expires = new Date(endDate)
  expires.setDate(expires.getDate() + Number(expiresDays))
  const expiresAt = expires.toISOString()
  const rows = types.map((type) => ({
    deployment_id: deploymentId,
    type,
    expires_at: expiresAt,
  }))
  if (!rows.length) return {}
  const { error } = await supabase
    .from('survey_tokens')
    .upsert(rows, { onConflict: 'deployment_id,type' })
  if (error) throw error
  const { data } = await supabase
    .from('survey_tokens')
    .select('type, token')
    .eq('deployment_id', deploymentId)
  const map = {}
  for (const t of data ?? []) map[t.type] = t.token
  return map
}

export async function updateDeploymentStatus(id, status) {
  const { data, error } = await supabase
    .from('deployments')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function archiveDeployment(id) {
  const { data, error } = await supabase
    .from('deployments')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function archiveVolunteer(id) {
  const { data, error } = await supabase
    .from('volunteers')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function archiveOrganisation(id) {
  const { data, error } = await supabase
    .from('organisations')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Edge functions return { success, data?, error? }; normalise like admin.js does.
function unwrapFunctionResponse(data) {
  if (data && data.success === false) throw new Error(data.error || 'Request failed.')
  return data?.data ?? data ?? {}
}

export async function sendSurveyEmails(deploymentId, expiresDays = 14, types = null) {
  const { data, error } = await supabase.functions.invoke('send-survey-emails', {
    body: { deployment_id: deploymentId, expires_days: expiresDays, types },
  })
  if (error) throw new Error(error.message || 'Could not reach the email service.')
  return unwrapFunctionResponse(data)
}

// --- Surveys (instrument lifecycle) -----------------------------------------

// Defaults used when the `surveys` table has not been migrated yet, so the
// Surveys page still works (read-only lifecycle) against the fixed instruments.
const VIRTUAL_SURVEYS = [
  {
    id: 'virtual-volunteer',
    key: 'volunteer',
    title: 'Volunteer Self-Report Survey',
    description:
      'Completed by volunteers at the end of a deployment to capture their onboarding experience, work experience, satisfaction and open feedback.',
    status: 'PUBLISHED',
    scheduled_at: null,
    published_at: null,
    closed_at: null,
    default_expiry_days: 14,
    updated_at: null,
    is_builtin: true,
    definition: {},
    _virtual: true,
  },
  {
    id: 'virtual-org',
    key: 'org',
    title: 'Organisation Feedback Survey',
    description:
      "Completed by the partner organisation's supervisor to assess the volunteer's task performance, professionalism and organisational impact.",
    status: 'PUBLISHED',
    scheduled_at: null,
    published_at: null,
    closed_at: null,
    default_expiry_days: 14,
    updated_at: null,
    is_builtin: true,
    definition: {},
    _virtual: true,
  },
]

const EMPTY_DEFINITION = { type: 'custom', likertSections: [], overall: { title: 'Overall', sliders: [], radios: [] }, feedback: { title: 'Additional comments', note: 'Optional.', fields: [] } }

// Resolve the question config for a survey: built-ins use the fixed code config;
// custom surveys use their stored `definition`.
export function getSurveyConfig(survey) {
  if (!survey) return VOLUNTEER_SURVEY
  if (survey.is_builtin || survey.key === 'volunteer' || survey.key === 'org') {
    return survey.key === 'org' ? ORG_SURVEY : VOLUNTEER_SURVEY
  }
  const def = survey.definition && Object.keys(survey.definition).length ? survey.definition : EMPTY_DEFINITION
  return { ...EMPTY_DEFINITION, ...def, overall: { ...EMPTY_DEFINITION.overall, ...(def.overall || {}) }, feedback: { ...EMPTY_DEFINITION.feedback, ...(def.feedback || {}) } }
}

function isMissingTableError(error) {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  return /could not find the table|schema cache/i.test(error.message || '')
}

function responseTable(key) {
  return key === 'org' ? 'org_surveys' : 'volunteer_surveys'
}

async function countResponses(survey) {
  if (survey.is_builtin) {
    const table = responseTable(survey.key)
    const [{ count }, latest] = await Promise.all([
      supabase.from(table).select('id', { count: 'exact', head: true }),
      supabase.from(table).select('submitted_at').order('submitted_at', { ascending: false }).limit(1),
    ])
    return { responseCount: count ?? 0, lastResponseAt: latest?.data?.[0]?.submitted_at ?? null }
  }
  const [{ count }, latest] = await Promise.all([
    supabase.from('survey_responses').select('id', { count: 'exact', head: true }).eq('survey_id', survey.id),
    supabase.from('survey_responses').select('submitted_at').eq('survey_id', survey.id).order('submitted_at', { ascending: false }).limit(1),
  ])
  return { responseCount: count ?? 0, lastResponseAt: latest?.data?.[0]?.submitted_at ?? null }
}

// List surveys (built-in + custom) enriched with live response counts and the
// most recent submission. Falls back to virtual instruments if not migrated.
export async function fetchSurveys() {
  let surveys
  const { data, error } = await supabase.from('surveys').select('*').order('is_builtin', { ascending: false }).order('created_at', { ascending: true })
  if (error) {
    // Table not migrated yet -> graceful fallback to the fixed instruments.
    if (isMissingTableError(error)) {
      surveys = VIRTUAL_SURVEYS.map((s) => ({ ...s }))
    } else {
      throw error
    }
  } else if (!data || data.length === 0) {
    surveys = VIRTUAL_SURVEYS.map((s) => ({ ...s }))
  } else {
    surveys = data
  }

  return Promise.all(
    surveys.map(async (s) => ({ ...s, ...(await countResponses(s).catch(() => ({ responseCount: 0, lastResponseAt: null }))) }))
  )
}

export async function updateSurvey(id, patch) {
  const next = { ...patch }
  if (patch.status === 'PUBLISHED') next.published_at = patch.published_at ?? new Date().toISOString()
  if (patch.status === 'CLOSED') next.closed_at = patch.closed_at ?? new Date().toISOString()
  if (patch.status && patch.status !== 'SCHEDULED') next.scheduled_at = patch.scheduled_at ?? null
  const { data, error } = await supabase.from('surveys').update(next).eq('id', id).select().single()
  if (error) throw error
  return data
}

function slugify(text) {
  return (text || 'survey')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'survey'
}

export async function createSurvey({ title, description, audience, definition, status = 'DRAFT', default_expiry_days = 14 }) {
  const key = `${slugify(title)}-${Math.random().toString(36).slice(2, 8)}`
  const insert = {
    key,
    title: title?.trim(),
    description: description?.trim() || null,
    audience: audience?.trim() || null,
    definition: definition || EMPTY_DEFINITION,
    status,
    is_builtin: false,
    default_expiry_days: Number(default_expiry_days) || 14,
  }
  if (status === 'PUBLISHED') insert.published_at = new Date().toISOString()
  const { data, error } = await supabase.from('surveys').insert(insert).select().single()
  if (error) throw error
  return data
}

export async function deleteSurvey(id) {
  const { error } = await supabase.from('surveys').delete().eq('id', id)
  if (error) throw error
  return true
}

// All submitted responses for a survey. Built-ins join deployment context;
// custom surveys return their JSONB answers flattened for display/export.
export async function fetchSurveyResponses(survey) {
  if (survey.is_builtin) {
    const table = responseTable(survey.key)
    const { data, error } = await supabase
      .from(table)
      .select(
        `*, deployments:deployment_id (
           id, role_title, start_date, end_date, status,
           volunteers ( id, full_name, volunteer_id, email ),
           organisations ( id, name, sector )
         )`
      )
      .order('submitted_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => {
      const dep = r.deployments || {}
      return { ...r, deployment: dep, volunteer: one(dep.volunteers), organisation: one(dep.organisations) }
    })
  }

  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('survey_id', survey.id)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    respondent_name: r.respondent_name,
    respondent_email: r.respondent_email,
    ...(r.answers || {}),
    _custom: true,
  }))
}

// Next volunteer code suggestion, e.g. AV-2026-003
export async function nextVolunteerCode() {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('volunteers')
    .select('volunteer_id')
    .ilike('volunteer_id', `AV-${year}-%`)
  let max = 0
  for (const v of data ?? []) {
    const n = parseInt(v.volunteer_id.split('-')[2], 10)
    if (!Number.isNaN(n)) max = Math.max(max, n)
  }
  return `AV-${year}-${String(max + 1).padStart(3, '0')}`
}
