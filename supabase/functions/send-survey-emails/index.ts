// =============================================================================
// Afrivate M&E - Survey email dispatch (spec Section 7).
//
//   POST /functions/v1/send-survey-emails  { deployment_id, expires_days? }
//
// Called by the authenticated app when a deployment is created (or to resend).
// Generates/reuses the volunteer + org survey tokens and emails both parties
// via Gmail SMTP (afrivatehr@gmail.com). Requires an authenticated ADMIN/HR caller.
//
// Only PUBLISHED surveys are sent. Delivery results (delivered / failed /
// skipped / missing) are returned so the app can report what actually happened.
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.15'
import { BRAND, button, fallbackLink, h1, infoCard, p, shell } from '../_shared/email-shell.ts'

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
const smtpHost = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '587')
const smtpUser = Deno.env.get('SMTP_USER') ?? ''
const smtpPass = Deno.env.get('SMTP_PASS') ?? ''
const { fromName, fromEmail } = parseFrom(
  Deno.env.get('EMAIL_FROM') ?? 'Afrivate M&E <afrivatehr@gmail.com>',
)
const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
const logoUrl = (Deno.env.get('LOGO_URL') ?? `${appUrl}/logos/afrivate-full-logo-purple.png`).replace(/\/$/, '')

function parseFrom(s: string): { fromName?: string; fromEmail: string } {
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/)
  if (m) return { fromName: m[1] || undefined, fromEmail: m[2] }
  return { fromEmail: s.trim() }
}

// PostgREST may return embedded FK relations as an object or a single-item array.
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel ?? null
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
    const requestedTypes = Array.isArray(body?.types) ? body.types as string[] : null
    if (!deploymentId) return json({ success: false, error: 'Missing deployment_id.' }, 400)

    const { data: deployment, error: depErr } = await admin
      .from('deployments')
      .select(
        'id, role_title, start_date, end_date, volunteer_id, organisation_id, volunteers ( full_name, email ), organisations ( name, contact_name, contact_email )',
      )
      .eq('id', deploymentId)
      .single()

    if (depErr || !deployment) return json({ success: false, error: 'Deployment not found.' }, 404)

    const sendTypes = resolveSendTypes(deployment, requestedTypes)
    if (!sendTypes.length) {
      return json({ success: false, error: 'This deployment has no survey recipients configured.' }, 400)
    }

    const expiresAt = new Date(deployment.end_date)
    expiresAt.setDate(expiresAt.getDate() + expiresDays)

    const tokens = await ensureTokens(admin, deploymentId, expiresAt.toISOString(), sendTypes)

    // Only invite parties whose survey instrument is currently PUBLISHED.
    const publishedTypes = await getPublishedTypes(admin)
    const isOpen = (type: string) => publishedTypes === null || publishedTypes.has(type)

    const vol = one(deployment.volunteers)
    const org = one(deployment.organisations)
    const period = `${fmt(deployment.start_date)} – ${fmt(deployment.end_date)}`
    const closesOn = fmt(expiresAt.toISOString())

    const results: Record<string, unknown> = {}
    const delivered: string[] = []
    const skipped: string[] = []
    const failed: { type: string; to: string; error: string }[] = []
    const missing: string[] = []

    // --- Volunteer ----------------------------------------------------------
    if (sendTypes.includes('volunteer')) {
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
    }

    // --- Organisation -------------------------------------------------------
    if (sendTypes.includes('org')) {
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
  // If the table exists but nothing is published, don't block deployment emails.
  if (set.size === 0) return null
  return set
}

function resolveSendTypes(
  deployment: { volunteer_id?: string | null; organisation_id?: string | null },
  requested: string[] | null,
) {
  const available: string[] = []
  if (deployment.volunteer_id) available.push('volunteer')
  if (deployment.organisation_id) available.push('org')
  if (!requested?.length) return available
  return requested.filter((t) => available.includes(t))
}

async function ensureTokens(
  admin: ReturnType<typeof createClient>,
  deploymentId: string,
  expiresAt: string,
  types: string[],
) {
  const { data: existing } = await admin
    .from('survey_tokens')
    .select('type, token')
    .eq('deployment_id', deploymentId)

  const map: Record<string, string> = {}
  for (const row of existing ?? []) map[row.type] = row.token

  for (const type of types) {
    if (!map[type]) {
      const token = crypto.randomUUID()
      const { error } = await admin
        .from('survey_tokens')
        .insert({ deployment_id: deploymentId, type, token, expires_at: expiresAt })
      if (!error) map[type] = token
    } else {
      await admin
        .from('survey_tokens')
        .update({ expires_at: expiresAt })
        .eq('deployment_id', deploymentId)
        .eq('type', type)
    }
  }
  return map
}

async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text?: string }) {
  try {
    if (!smtpUser || !smtpPass) {
      return {
        ok: false,
        status: 0,
        error: {
          message:
            'Email is not configured. Set SMTP_USER and SMTP_PASS (Gmail app password) on the Edge Function.',
        },
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const info = await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      subject,
      text,
      html,
      replyTo: fromEmail,
      headers: {
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'Auto-Submitted': 'auto-generated',
      },
    })

    return { ok: true, status: 200, id: info.messageId }
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

function volunteerEmail({ volunteerName, orgName, role, period, closesOn, link }: {
  volunteerName: string; orgName: string; role: string; period: string; closesOn: string; link: string
}) {
  const text = `Dear ${volunteerName},

Thank you for your service as ${role} at ${orgName} (${period}).

Please take 5–10 minutes to share your experience. Your feedback directly improves how Afrivate supports future volunteers, and all responses are confidential.

Complete your survey: ${link}

This link is unique to you and closes on ${closesOn}.

PLEASE DO NOT REPLY to this email. Contact your Afrivate M&E coordinator if you need help.

The Afrivate M&E Team
AfriVate Technologies Ltd.`

  const body = `
    ${h1(`Thank you for your service, ${volunteerName.split(' ')[0]} 👏`)}
    ${p(`We'd love to hear about your time as <strong>${role}</strong> at <strong>${orgName}</strong>. Your honest feedback helps us improve placements for every volunteer who comes after you.`)}
    ${infoCard([['Organisation', orgName], ['Your role', role], ['Deployment', period]])}
    ${p('It takes about <strong>5–10 minutes</strong> and your responses are completely confidential.')}
    ${button(link, 'Start your survey →', BRAND.purple)}
    ${p(`⏳ This link is unique to you and closes on <strong>${closesOn}</strong>.`)}
    ${fallbackLink(link)}`

  return {
    html: shell({
      preheader: `Share your experience at ${orgName} — takes 5–10 minutes.`,
      accent: BRAND.blue,
      body,
      logoUrl,
      footerNote:
        'This is an automated message from the Afrivate Monitoring &amp; Evaluation team. Your responses are confidential and used only to improve volunteer placements.',
    }),
    text,
  }
}

function orgEmail({ supervisorName, volunteerName, orgName, role, period, closesOn, link }: {
  supervisorName: string; volunteerName: string; orgName: string; role: string; period: string; closesOn: string; link: string
}) {
  const text = `Dear ${supervisorName},

Thank you for hosting ${volunteerName} as ${role} at ${orgName} (${period}).

Your feedback is essential for measuring volunteer effectiveness and improving future deployments. Please complete this short assessment. All responses are treated confidentially.

Complete the assessment: ${link}

This link is unique to this deployment and closes on ${closesOn}.

PLEASE DO NOT REPLY to this email — this inbox is not monitored. Contact your Afrivate M&E coordinator if you need help.

The Afrivate M&E Team
AfriVate Technologies Ltd.`

  const body = `
    ${h1('A quick feedback request')}
    ${p(`Dear ${supervisorName}, thank you for hosting <strong>${volunteerName}</strong> at <strong>${orgName}</strong>. Your assessment of their contribution is a key part of how Afrivate measures and improves volunteer impact.`)}
    ${infoCard([['Volunteer', volunteerName], ['Role', role], ['Deployment', period]])}
    ${p('The assessment takes about <strong>5 minutes</strong> and all responses are kept confidential.')}
    ${button(link, 'Complete the assessment →', BRAND.green)}
    ${p(`⏳ This link is unique to this deployment and closes on <strong>${closesOn}</strong>.`)}
    ${fallbackLink(link)}`

  return {
    html: shell({
      preheader: `Assess ${volunteerName}'s contribution — about 5 minutes.`,
      accent: BRAND.green,
      body,
      logoUrl,
      footerNote:
        'This is an automated message from the Afrivate Monitoring &amp; Evaluation team. Your responses are confidential and used only to improve volunteer placements.',
    }),
    text,
  }
}
