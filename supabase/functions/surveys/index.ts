// =============================================================================
// Afrivate M&E - Public survey Edge Function (token-validated, no auth).
//
//   GET  /functions/v1/surveys?token=UUID   -> deployment context for the form
//   POST /functions/v1/surveys              -> submit a survey { token, answers }
//
// Uses the service-role key to bypass RLS; the token itself is the access
// control. The database triggers compute section averages + VPI and mark the
// token as used (one-time use).
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Required Likert/scale fields per survey type (used for light validation).
const VOLUNTEER_REQUIRED = [
  's2_clear_briefing', 's2_felt_welcome', 's2_tools_available', 's2_afrivate_support', 's2_knew_who_to_contact',
  's3_skills_matched', 's3_meaningful_impact', 's3_appropriate_responsibility', 's3_manageable_workload', 's3_useful_feedback', 's3_learning_opportunities',
  's4_inclusive_culture', 's4_safe_environment', 's4_collaborative_staff', 's4_clear_communication',
  's5_overall_satisfaction', 's5_nps_score', 's5_volunteer_again',
]
const VOLUNTEER_OPTIONAL = ['s6_org_strengths', 's6_org_improvements', 's6_afrivate_improvements', 's6_other_comments']

const ORG_REQUIRED = [
  'supervisor_name', 'supervisor_title',
  's2_tasks_completed', 's2_skills_demonstrated', 's2_deadlines_met', 's2_initiative', 's2_work_quality', 's2_minimal_supervision',
  's3_professional_behaviour', 's3_clear_communication', 's3_policy_adherence', 's3_punctuality', 's3_team_integration',
  's4_measurable_value', 's4_mission_support', 's4_irreplaceable_contrib', 's4_moral_effect',
  's5_overall_effectiveness', 's5_request_again', 's5_request_same_vol',
]
const ORG_OPTIONAL = ['s6_strengths', 's6_improvements', 's6_afrivate_improvements', 's6_other_feedback']

const INTEGER_FIELDS = new Set([
  ...VOLUNTEER_REQUIRED.filter((k) => k !== 's5_volunteer_again'),
  ...ORG_REQUIRED.filter((k) => !['supervisor_name', 'supervisor_title', 's5_request_again', 's5_request_same_vol'].includes(k)),
])

function coercePayload(payload: Record<string, unknown>) {
  for (const key of INTEGER_FIELDS) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      payload[key] = Number(payload[key])
    }
  }
}

const LIKERT_FIELDS = new Set([
  ...VOLUNTEER_REQUIRED.filter((k) => !['s5_overall_satisfaction', 's5_nps_score', 's5_volunteer_again'].includes(k)),
  ...ORG_REQUIRED.filter((k) => !['supervisor_name', 'supervisor_title', 's5_overall_effectiveness', 's5_request_again', 's5_request_same_vol'].includes(k)),
])

function validateScores(payload: Record<string, unknown>, type: 'volunteer' | 'org') {
  for (const key of LIKERT_FIELDS) {
    if (!(key in payload)) continue
    const n = Number(payload[key])
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return `Invalid score for ${key} (must be 1–5).`
    }
  }
  if (type === 'volunteer') {
    const sat = Number(payload.s5_overall_satisfaction)
    if (!Number.isFinite(sat) || sat < 1 || sat > 10) return 'Overall satisfaction must be 1–10.'
    const nps = Number(payload.s5_nps_score)
    if (!Number.isFinite(nps) || nps < 0 || nps > 10) return 'Recommendation score must be 0–10.'
  } else {
    const eff = Number(payload.s5_overall_effectiveness)
    if (!Number.isFinite(eff) || eff < 1 || eff > 10) return 'Overall effectiveness must be 1–10.'
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const surveyId = url.searchParams.get('survey')
      if (surveyId) {
        const ctx = await loadCustomSurvey(supabase, surveyId)
        if ('error' in ctx) return json({ success: false, error: ctx.error }, ctx.status)
        return json({ success: true, data: ctx })
      }
      const token = url.searchParams.get('token')
      if (!token) return json({ success: false, error: 'Missing token.' }, 400)
      const ctx = await loadContext(supabase, token)
      if ('error' in ctx) return json({ success: false, error: ctx.error }, ctx.status)
      return json({ success: true, data: ctx })
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)

      // Custom (non-deployment) survey submission.
      if (body?.survey_id) {
        return await submitCustom(supabase, body)
      }

      if (!body?.token) return json({ success: false, error: 'Missing token.' }, 400)

      const ctx = await loadContext(supabase, body.token)
      if ('error' in ctx) return json({ success: false, error: ctx.error }, ctx.status)
      if (ctx.alreadySubmitted) {
        return json({ success: false, error: 'This survey has already been submitted.' }, 409)
      }
      if (ctx.accepting === false) {
        return json({ success: false, error: 'This survey is not currently open for responses.' }, 403)
      }

      const answers = body.answers ?? {}
      const required = ctx.type === 'org' ? ORG_REQUIRED : VOLUNTEER_REQUIRED
      const optional = ctx.type === 'org' ? ORG_OPTIONAL : VOLUNTEER_OPTIONAL

      for (const field of required) {
        const v = answers[field]
        if (v === undefined || v === null || v === '') {
          return json({ success: false, error: `Missing required field: ${field}` }, 400)
        }
      }

      // Build a clean payload of known columns only.
      const payload: Record<string, unknown> = { deployment_id: ctx.deployment.id }
      for (const field of [...required, ...optional]) {
        if (answers[field] !== undefined) payload[field] = answers[field]
      }
      coercePayload(payload)
      const scoreErr = validateScores(payload, ctx.type as 'volunteer' | 'org')
      if (scoreErr) return json({ success: false, error: scoreErr }, 400)

      const table = ctx.type === 'org' ? 'org_surveys' : 'volunteer_surveys'
      const { error } = await supabase.from(table).insert(payload)
      if (error) {
        const conflict = error.code === '23505'
        return json(
          { success: false, error: conflict ? 'This survey has already been submitted.' : error.message },
          conflict ? 409 : 500,
        )
      }

      return json({ success: true, data: { submitted: true, type: ctx.type } })
    }

    return json({ success: false, error: 'Method not allowed.' }, 405)
  } catch (err) {
    return json({ success: false, error: String(err?.message ?? err) }, 500)
  }
})

// --- Custom (standalone, public-link) surveys -------------------------------
async function loadCustomSurvey(supabase: ReturnType<typeof createClient>, id: string) {
  const { data: survey, error } = await supabase
    .from('surveys')
    .select('id, title, description, definition, status, is_builtin')
    .eq('id', id)
    .maybeSingle()

  if (error || !survey) return { error: 'This survey link is invalid.', status: 404 }
  if (survey.is_builtin) return { error: 'This survey is not available via a public link.', status: 400 }

  return {
    custom: true,
    accepting: survey.status === 'PUBLISHED',
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      definition: survey.definition ?? {},
    },
  }
}

function customRequiredKeys(definition: Record<string, unknown>): string[] {
  const keys: string[] = []
  const def = definition as {
    likertSections?: { questions?: { key: string }[] }[]
    overall?: { sliders?: { key: string }[]; radios?: { key: string }[] }
  }
  for (const section of def.likertSections ?? []) for (const q of section.questions ?? []) keys.push(q.key)
  for (const s of def.overall?.sliders ?? []) keys.push(s.key)
  for (const r of def.overall?.radios ?? []) keys.push(r.key)
  return keys
}

async function submitCustom(supabase: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const surveyId = body.survey_id as string
  const ctx = await loadCustomSurvey(supabase, surveyId)
  if ('error' in ctx) return json({ success: false, error: ctx.error }, ctx.status)
  if (!ctx.accepting) {
    return json({ success: false, error: 'This survey is not currently open for responses.' }, 403)
  }

  const answers = (body.answers ?? {}) as Record<string, unknown>
  const respondentEmail = String(body.respondent_email ?? '').trim().toLowerCase()
  if (respondentEmail) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', surveyId)
      .eq('respondent_email', respondentEmail)
      .gte('submitted_at', oneDayAgo)
    if ((count ?? 0) >= 5) {
      return json({ success: false, error: 'Too many submissions from this email today. Please try again tomorrow.' }, 429)
    }
  }

  const required = customRequiredKeys(ctx.survey.definition as Record<string, unknown>)
  for (const field of required) {
    const v = answers[field]
    if (v === undefined || v === null || v === '') {
      return json({ success: false, error: 'Please answer all required questions.' }, 400)
    }
  }

  const { error } = await supabase.from('survey_responses').insert({
    survey_id: surveyId,
    respondent_name: (body.respondent_name as string) ?? null,
    respondent_email: (body.respondent_email as string) ?? null,
    answers,
  })
  if (error) return json({ success: false, error: error.message }, 500)
  return json({ success: true, data: { submitted: true, custom: true } })
}

async function loadContext(supabase: ReturnType<typeof createClient>, token: string) {
  const { data: tokenRow } = await supabase
    .from('survey_tokens')
    .select('id, token, type, used, expires_at, deployment_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return { error: 'This survey link is invalid.', status: 404 }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return { error: 'This survey link has expired.', status: 410 }
  }

  const { data: deployment } = await supabase
    .from('deployments')
    .select(
      'id, role_title, org_contact_role, start_date, end_date, volunteers ( volunteer_id, full_name ), organisations ( name )',
    )
    .eq('id', tokenRow.deployment_id)
    .single()

  if (!deployment) return { error: 'Deployment not found.', status: 404 }

  const vol = one(deployment.volunteers)
  const org = one(deployment.organisations)

  const table = tokenRow.type === 'org' ? 'org_surveys' : 'volunteer_surveys'
  const { data: existingSurvey } = await supabase
    .from(table)
    .select('id')
    .eq('deployment_id', tokenRow.deployment_id)
    .maybeSingle()

  // Survey lifecycle gate: a survey only accepts responses while PUBLISHED.
  // If the surveys table isn't present yet, default to accepting (fallback).
  let accepting = true
  let surveyStatus: string | null = null
  const { data: surveyRow, error: surveyErr } = await supabase
    .from('surveys')
    .select('status')
    .eq('key', tokenRow.type)
    .maybeSingle()
  if (!surveyErr && surveyRow) {
    surveyStatus = surveyRow.status
    accepting = surveyRow.status === 'PUBLISHED'
  }

  return {
    type: tokenRow.type as 'volunteer' | 'org',
    alreadySubmitted: Boolean(existingSurvey?.id) || tokenRow.used,
    accepting,
    surveyStatus,
    deployment: {
      id: deployment.id,
      role_title: deployment.role_title,
      org_contact_role: deployment.org_contact_role,
      start_date: deployment.start_date,
      end_date: deployment.end_date,
    },
    volunteer: {
      volunteer_id: vol?.volunteer_id,
      full_name: vol?.full_name,
    },
    organisation: { name: org?.name },
  }
}
