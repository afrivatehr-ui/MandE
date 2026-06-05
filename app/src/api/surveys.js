import { FUNCTIONS_URL } from '../lib/supabase'

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// The anon key is a valid (public) JWT, so anonymous respondents can reach the
// function gateway with it. Token validation happens inside the function.
const headers = {
  'Content-Type': 'application/json',
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
}

export async function getSurveyContext(token) {
  const res = await fetch(`${FUNCTIONS_URL}/surveys?token=${encodeURIComponent(token)}`, { headers })
  const body = await res.json().catch(() => ({ success: false, error: 'Network error.' }))
  if (!res.ok || !body.success) {
    const err = new Error(body.error || 'Unable to load this survey.')
    err.status = res.status
    throw err
  }
  return body.data
}

export async function submitSurvey(token, answers) {
  const res = await fetch(`${FUNCTIONS_URL}/surveys`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token, answers }),
  })
  const body = await res.json().catch(() => ({ success: false, error: 'Network error.' }))
  if (!res.ok || !body.success) {
    const err = new Error(body.error || 'Unable to submit your response.')
    err.status = res.status
    throw err
  }
  return body.data
}

// --- Custom (standalone) surveys --------------------------------------------
export async function getCustomSurvey(id) {
  const res = await fetch(`${FUNCTIONS_URL}/surveys?survey=${encodeURIComponent(id)}`, { headers })
  const body = await res.json().catch(() => ({ success: false, error: 'Network error.' }))
  if (!res.ok || !body.success) {
    const err = new Error(body.error || 'Unable to load this survey.')
    err.status = res.status
    throw err
  }
  return body.data
}

export async function submitCustomSurvey(surveyId, answers, respondent = {}) {
  const res = await fetch(`${FUNCTIONS_URL}/surveys`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      survey_id: surveyId,
      answers,
      respondent_name: respondent.name || null,
      respondent_email: respondent.email || null,
    }),
  })
  const body = await res.json().catch(() => ({ success: false, error: 'Network error.' }))
  if (!res.ok || !body.success) {
    const err = new Error(body.error || 'Unable to submit your response.')
    err.status = res.status
    throw err
  }
  return body.data
}
