// =============================================================================
// Afrivate M&E - Survey email dispatch (spec Section 7).
//
//   POST /functions/v1/send-survey-emails  { deployment_id, expires_days? }
//
// Called by the authenticated app when a deployment is created (or to resend).
// Generates/reuses the volunteer + org survey tokens and emails both parties
// via Plunk (https://useplunk.com). Requires an authenticated ADMIN/HR caller.
//
// Only PUBLISHED surveys are sent. Delivery results (delivered / failed /
// skipped / missing) are returned so the app can report what actually happened.
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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
// Plunk transactional email. PLUNK_API_KEY is the *secret* key (starts with sk_).
const plunkKey = Deno.env.get('PLUNK_API_KEY')!
const plunkUrl = (Deno.env.get('PLUNK_API_URL') ?? 'https://api.useplunk.com').replace(/\/$/, '')
// "Name <email@domain>" or just "email@domain". The domain must be verified in Plunk.
const { fromName, fromEmail } = parseFrom(Deno.env.get('EMAIL_FROM') ?? 'Afrivate M&E <hello@example.com>')
const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

function parseFrom(s: string): { fromName?: string; fromEmail: string } {
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/)
  if (m) return { fromName: m[1] || undefined, fromEmail: m[2] }
  return { fromEmail: s.trim() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405)

  const admin = createClient(supabaseUrl, serviceKey)

  // --- AuthZ: confirm the caller is a staff writer (ADMIN/HR) ---------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return json({ success: false, error: 'Not authenticated.' }, 401)

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['ADMIN', 'HR'].includes(profile.role)) {
    return json({ success: false, error: 'Not authorised.' }, 403)
  }

  try {
    const body = await req.json().catch(() => null)
    const deploymentId = body?.deployment_id
    const expiresDays = Number(body?.expires_days ?? 14)
    if (!deploymentId) return json({ success: false, error: 'Missing deployment_id.' }, 400)

    const { data: deployment, error: depErr } = await admin
      .from('deployments')
      .select(
        'id, role_title, start_date, end_date, volunteers ( full_name, email ), organisations ( name, contact_name, contact_email )',
      )
      .eq('id', deploymentId)
      .single()

    if (depErr || !deployment) return json({ success: false, error: 'Deployment not found.' }, 404)

    const expiresAt = new Date(deployment.end_date)
    expiresAt.setDate(expiresAt.getDate() + expiresDays)

    // Reuse existing tokens (resend) or create new ones.
    const tokens = await ensureTokens(admin, deploymentId, expiresAt.toISOString())

    // Only invite parties whose survey instrument is currently PUBLISHED.
    const publishedTypes = await getPublishedTypes(admin)
    const isOpen = (type: string) => publishedTypes === null || publishedTypes.has(type)

    const vol = deployment.volunteers
    const org = deployment.organisations
    const period = `${fmt(deployment.start_date)} – ${fmt(deployment.end_date)}`
    const closesOn = fmt(expiresAt.toISOString())

    const results: Record<string, unknown> = {}
    const delivered: string[] = []
    const skipped: string[] = []
    const failed: { type: string; to: string; error: string }[] = []
    const missing: string[] = []

    // --- Volunteer ----------------------------------------------------------
    if (!isOpen('volunteer')) {
      skipped.push('volunteer')
    } else if (!vol?.email) {
      missing.push('volunteer')
    } else {
      const r = await sendEmail({
        to: vol.email,
        subject: `Share your Afrivate volunteer experience — ${org?.name ?? ''}`.trim(),
        ...volunteerEmail({
          volunteerName: vol.full_name,
          orgName: org?.name ?? 'the organisation',
          role: deployment.role_title,
          period,
          closesOn,
          link: `${appUrl}/survey/volunteer/${tokens.volunteer}`,
        }),
      })
      results.volunteer = r
      if (r.ok) delivered.push('volunteer')
      else failed.push({ type: 'volunteer', to: vol.email, error: humanError(r) })
    }

    // --- Organisation -------------------------------------------------------
    if (!isOpen('org')) {
      skipped.push('org')
    } else if (!org?.contact_email) {
      missing.push('org')
    } else {
      const r = await sendEmail({
        to: org.contact_email,
        subject: `Feedback request: ${vol?.full_name ?? 'your volunteer'} | Afrivate`,
        ...orgEmail({
          supervisorName: org.contact_name ?? 'there',
          volunteerName: vol?.full_name ?? 'the volunteer',
          orgName: org.name,
          role: deployment.role_title,
          period,
          closesOn,
          link: `${appUrl}/survey/org/${tokens.org}`,
        }),
      })
      results.org = r
      if (r.ok) delivered.push('org')
      else failed.push({ type: 'org', to: org.contact_email, error: humanError(r) })
    }

    return json({ success: true, data: { tokens, results, delivered, skipped, failed, missing } })
  } catch (err) {
    return json({ success: false, error: String((err as Error)?.message ?? err) }, 500)
  }
})

// Returns the set of survey types ('volunteer' | 'org') that are PUBLISHED, or
// null when the surveys table is missing/unseeded (so callers don't block).
async function getPublishedTypes(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.from('surveys').select('key, status')
  if (error || !data || data.length === 0) return null
  const set = new Set<string>()
  for (const row of data) if (row.status === 'PUBLISHED') set.add(row.key)
  return set
}

async function ensureTokens(admin: ReturnType<typeof createClient>, deploymentId: string, expiresAt: string) {
  const { data: existing } = await admin
    .from('survey_tokens')
    .select('type, token')
    .eq('deployment_id', deploymentId)

  const map: Record<string, string> = {}
  for (const row of existing ?? []) map[row.type] = row.token

  for (const type of ['volunteer', 'org']) {
    if (!map[type]) {
      const token = crypto.randomUUID()
      const { error } = await admin
        .from('survey_tokens')
        .insert({ deployment_id: deploymentId, type, token, expires_at: expiresAt })
      if (!error) map[type] = token
    }
  }
  return map
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string; text?: string }) {
  try {
    const res = await fetch(`${plunkUrl}/v1/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${plunkKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        body: html,
        from: fromEmail,
        name: fromName,
        subscribed: true, // transactional: do not require an opt-in contact
      }),
    })
    const payload = await res.json().catch(() => ({}))
    const ok = res.ok && payload?.success !== false
    return { ok, status: res.status, id: payload?.emails?.[0]?.contact ?? payload?.id, error: ok ? undefined : payload }
  } catch (err) {
    return { ok: false, status: 0, error: { message: String((err as Error)?.message ?? err) } }
  }
}

function humanError(r: { error?: unknown }): string {
  const e = r.error as { message?: string; name?: string; error?: string } | undefined
  return e?.message || e?.error || e?.name || 'Email provider rejected the message.'
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// --- Branded email building blocks ------------------------------------------
const BRAND = {
  purple: '#8D4087',
  purpleDark: '#6E2F69',
  lavender: '#F0E7F6',
  blue: '#1D45CF',
  green: '#317D34',
  ink: '#1A1A1A',
  muted: '#6B6B6B',
}

function shell(opts: { preheader: string; accent: string; body: string }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light"></head>
  <body style="margin:0;padding:0;background:${BRAND.lavender};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lavender};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(141,64,135,0.12)">
        <!-- Header -->
        <tr><td style="background:${BRAND.purple};padding:28px 32px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-family:Poppins,Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:.3px">Afrivate</td>
            <td align="right" style="font-family:Roboto,Arial,sans-serif;font-size:12px;color:rgba(255,255,255,.85)">Monitoring&nbsp;&amp;&nbsp;Evaluation</td>
          </tr></table>
        </td></tr>
        <!-- Accent bar -->
        <tr><td style="height:4px;background:${opts.accent};font-size:0;line-height:0">&nbsp;</td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">${opts.body}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#FAF7FC;border-top:1px solid ${BRAND.lavender}">
          <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:12px;color:${BRAND.muted};line-height:1.6">
            This is an automated message from the Afrivate Monitoring &amp; Evaluation team.<br>
            Your responses are confidential and used only to improve volunteer placements.
          </p>
          <p style="margin:10px 0 0;font-family:Poppins,Arial,sans-serif;font-size:12px;color:${BRAND.purple};font-weight:600">AfriVate Technologies Ltd.</p>
        </td></tr>
      </table>
      <p style="font-family:Roboto,Arial,sans-serif;font-size:11px;color:${BRAND.muted};margin:16px 0 0">© ${new Date().getFullYear()} AfriVate Technologies Ltd. · Please do not forward this link.</p>
    </td></tr>
  </table></body></html>`
}

function button(link: string, label: string, color: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td align="center" bgcolor="${color}" style="border-radius:10px">
    <a href="${link}" style="display:inline-block;padding:14px 32px;font-family:Poppins,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${label}</a>
  </td></tr></table>`
}

function infoCard(rows: [string, string][]) {
  const cells = rows
    .map(
      ([k, v]) => `<tr>
        <td style="padding:6px 0;font-family:Roboto,Arial,sans-serif;font-size:12px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.4px;width:42%">${k}</td>
        <td style="padding:6px 0;font-family:Roboto,Arial,sans-serif;font-size:14px;color:${BRAND.ink};font-weight:500">${v}</td>
      </tr>`,
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lavender};border-radius:12px;padding:8px 16px;margin:8px 0 4px">${cells}</table>`
}

function fallbackLink(link: string) {
  return `<p style="margin:18px 0 0;font-family:Roboto,Arial,sans-serif;font-size:12px;color:${BRAND.muted};line-height:1.6">
    Button not working? Copy and paste this link into your browser:<br>
    <a href="${link}" style="color:${BRAND.blue};word-break:break-all">${link}</a></p>`
}

function volunteerEmail({ volunteerName, orgName, role, period, closesOn, link }: {
  volunteerName: string; orgName: string; role: string; period: string; closesOn: string; link: string
}) {
  const text = `Dear ${volunteerName},

Thank you for your service as ${role} at ${orgName} (${period}).

Please take 5–10 minutes to share your experience. Your feedback directly improves how Afrivate supports future volunteers, and all responses are confidential.

Complete your survey: ${link}

This link is unique to you and closes on ${closesOn}.

The Afrivate M&E Team
AfriVate Technologies Ltd.`

  const body = `
    <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;font-weight:600;color:${BRAND.purple}">Thank you for your service, ${volunteerName.split(' ')[0]} 👏</h1>
    <p style="margin:0 0 16px;font-family:Roboto,Arial,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.7">
      We'd love to hear about your time as <strong>${role}</strong> at <strong>${orgName}</strong>. Your honest feedback helps us improve placements for every volunteer who comes after you.</p>
    ${infoCard([['Organisation', orgName], ['Your role', role], ['Deployment', period]])}
    <p style="margin:16px 0 0;font-family:Roboto,Arial,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.7">
      It takes about <strong>5–10 minutes</strong> and your responses are completely confidential.</p>
    ${button(link, 'Start your survey →', BRAND.purple)}
    <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:13px;color:${BRAND.muted}">⏳ This link is unique to you and closes on <strong>${closesOn}</strong>.</p>
    ${fallbackLink(link)}`

  return { html: shell({ preheader: `Share your experience at ${orgName} — takes 5–10 minutes.`, accent: BRAND.blue, body }), text }
}

function orgEmail({ supervisorName, volunteerName, orgName, role, period, closesOn, link }: {
  supervisorName: string; volunteerName: string; orgName: string; role: string; period: string; closesOn: string; link: string
}) {
  const text = `Dear ${supervisorName},

Thank you for hosting ${volunteerName} as ${role} at ${orgName} (${period}).

Your feedback is essential for measuring volunteer effectiveness and improving future deployments. Please complete this short assessment. All responses are treated confidentially.

Complete the assessment: ${link}

This link is unique to this deployment and closes on ${closesOn}.

The Afrivate M&E Team
AfriVate Technologies Ltd.`

  const body = `
    <h1 style="margin:0 0 12px;font-family:Poppins,Arial,sans-serif;font-size:22px;font-weight:600;color:${BRAND.purple}">A quick feedback request</h1>
    <p style="margin:0 0 16px;font-family:Roboto,Arial,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.7">
      Dear ${supervisorName}, thank you for hosting <strong>${volunteerName}</strong> at <strong>${orgName}</strong>. Your assessment of their contribution is a key part of how Afrivate measures and improves volunteer impact.</p>
    ${infoCard([['Volunteer', volunteerName], ['Role', role], ['Deployment', period]])}
    <p style="margin:16px 0 0;font-family:Roboto,Arial,sans-serif;font-size:15px;color:${BRAND.ink};line-height:1.7">
      The assessment takes about <strong>5 minutes</strong> and all responses are kept confidential.</p>
    ${button(link, 'Complete the assessment →', BRAND.green)}
    <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:13px;color:${BRAND.muted}">⏳ This link is unique to this deployment and closes on <strong>${closesOn}</strong>.</p>
    ${fallbackLink(link)}`

  return { html: shell({ preheader: `Assess ${volunteerName}'s contribution — about 5 minutes.`, accent: BRAND.green, body }), text }
}
