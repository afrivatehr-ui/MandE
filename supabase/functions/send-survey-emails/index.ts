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
const logoUrl = (Deno.env.get('LOGO_URL') ?? `${appUrl}/afrivate-logo.svg`).replace(/\/$/, '')

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
  const year = new Date().getFullYear()
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Afrivate M&amp;E</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-padding { padding: 24px 18px !important; }
      .email-header { padding: 22px 18px !important; }
      .email-body { padding: 24px 18px !important; }
      .email-footer { padding: 18px !important; }
      .logo-img { width: 120px !important; max-width: 120px !important; }
      .btn-link { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.lavender};word-spacing:normal;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.lavender};">
    <tr>
      <td align="center" style="padding:24px 12px;" class="email-padding">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td class="email-header" style="background-color:${BRAND.purple};padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${logoUrl}" width="140" alt="Afrivate — AfriVate Technologies" class="logo-img" style="display:block;width:140px;max-width:140px;height:auto;border:0;">
                  </td>
                  <td align="right" valign="middle" style="font-family:Roboto,Arial,sans-serif;font-size:11px;line-height:1.4;color:rgba(255,255,255,0.9);">
                    Monitoring&nbsp;&amp;&nbsp;Evaluation
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Accent -->
          <tr><td style="height:4px;background-color:${opts.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:32px;font-family:Roboto,Arial,sans-serif;color:${BRAND.ink};">${opts.body}</td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:20px 32px;background-color:#FAF7FC;border-top:1px solid ${BRAND.lavender};">
              <p style="margin:0 0 12px;font-family:Roboto,Arial,sans-serif;font-size:12px;line-height:1.65;color:${BRAND.muted};">
                This is an automated message from the Afrivate Monitoring &amp; Evaluation team at AfriVate Technologies Ltd.
                Your responses are confidential and used only to improve volunteer placements.
              </p>
              <p style="margin:0 0 12px;padding:10px 12px;background-color:#FFF8E6;border-left:3px solid #EFDA0E;font-family:Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.ink};">
                <strong>Please do not reply to this email.</strong> This inbox is not monitored. For help, contact your Afrivate M&amp;E coordinator directly.
              </p>
              <p style="margin:0;font-family:Poppins,Arial,sans-serif;font-size:12px;font-weight:600;color:${BRAND.purple};">AfriVate Technologies Ltd.</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:Roboto,Arial,sans-serif;font-size:11px;line-height:1.5;color:${BRAND.muted};max-width:600px;">
          © ${year} AfriVate Technologies Ltd. · This survey link is unique to you — please do not forward it.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(link: string, label: string, color: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
    <tr>
      <td align="center">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%" stroke="f" fillcolor="${color}">
          <w:anchorlock/>
          <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <a href="${link}" class="btn-link" style="background-color:${color};border-radius:10px;color:#ffffff;display:inline-block;font-family:Poppins,Arial,sans-serif;font-size:15px;font-weight:600;line-height:48px;text-align:center;text-decoration:none;padding:0 28px;min-width:200px;">${label}</a>
        <!--<![endif]-->
      </td>
    </tr>
  </table>`
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

PLEASE DO NOT REPLY to this email. Contact your Afrivate M&E coordinator if you need help.

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

PLEASE DO NOT REPLY to this email — this inbox is not monitored. Contact your Afrivate M&E coordinator if you need help.

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
