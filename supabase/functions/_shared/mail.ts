import nodemailer from 'npm:nodemailer@6.9.15'
import { BRAND, button, h1, infoCard, p, shell } from './email-shell.ts'

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  HR: 'HR (Read & write)',
  VIEWER: 'Viewer (Read only)',
}

function parseFrom(s: string): { fromName?: string; fromEmail: string } {
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/)
  if (m) return { fromName: m[1] || undefined, fromEmail: m[2] }
  return { fromEmail: s.trim() }
}

const smtpHost = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '587')
const smtpUser = Deno.env.get('SMTP_USER') ?? ''
const smtpPass = Deno.env.get('SMTP_PASS') ?? ''
export const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
export const logoUrl = (Deno.env.get('LOGO_URL') ?? `${appUrl}/logos/afrivate-full-logo-purple.png`).replace(/\/$/, '')

const { fromName, fromEmail } = parseFrom(
  Deno.env.get('EMAIL_FROM') ?? 'Afrivate M&E <afrivatehr@gmail.com>',
)

export function isSmtpConfigured() {
  return Boolean(smtpUser && smtpPass)
}

export function tempPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function transporter() {
  if (!isSmtpConfigured()) {
    throw new Error('Email is not configured on the server.')
  }
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  })
}

async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text: string
  preheader: string
  accent?: string
}) {
  await transporter().sendMail({
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    to: opts.to,
    subject: opts.subject,
    html: shell({
      preheader: opts.preheader,
      accent: opts.accent ?? BRAND.purple,
      body: opts.html,
      logoUrl,
    }),
    text: opts.text,
    replyTo: fromEmail,
  })
}

export async function sendWelcomeEmail(to: string, name: string, password: string) {
  const firstName = name.split(' ')[0] || 'there'
  const loginUrl = `${appUrl}/login`
  const changePasswordUrl = `${appUrl}/forgot-password`

  const body = `
    ${h1(`Welcome, ${firstName}!`)}
    ${p('Your Afrivate Monitoring &amp; Evaluation account is ready. Sign in with the details below, then change your password before you continue.')}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:16px 0;background-color:${BRAND.lavender};border-radius:8px;">
      <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${to}</p>
        <p style="margin:0;"><strong>Temporary password:</strong> <code style="font-family:monospace;font-size:15px;">${password}</code></p>
      </td></tr>
    </table>
    ${p('<strong>After your first sign-in, please change your password.</strong> Use the button below to choose a new password you will remember.')}
    ${button(changePasswordUrl, 'Change your password →', BRAND.blue)}
    ${p('You can also sign in first, then use <strong>Forgot password?</strong> on the sign-in page.')}
    ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`

  await sendMail({
    to,
    subject: 'Your Afrivate M&E account is ready',
    preheader: 'Your login details — please change your password after signing in.',
    accent: BRAND.purple,
    html: body,
    text: [
      `Welcome, ${firstName}!`,
      '',
      'Sign in at ' + loginUrl,
      `Email: ${to}`,
      `Temporary password: ${password}`,
      '',
      'After your first sign-in, please change your password:',
      changePasswordUrl,
      '',
      'AfriVate Technologies Ltd.',
    ].join('\n'),
  })
}

export type AccessRequestDetails = {
  name: string
  email: string
  organisation: string | null
  roleRequested: string
}

export async function notifyAdminsOfAccessRequest(
  adminEmails: string[],
  request: AccessRequestDetails,
) {
  if (!adminEmails.length) {
    throw new Error('No administrator email addresses are configured.')
  }

  const settingsUrl = `${appUrl}/settings`
  const roleLabel = ROLE_LABELS[request.roleRequested] ?? request.roleRequested
  const rows: [string, string][] = [
    ['Name', request.name],
    ['Email', request.email],
    ['Role requested', roleLabel],
  ]
  if (request.organisation) rows.push(['Organisation', request.organisation])

  const body = `
    ${h1('New access request')}
    ${p('Someone has requested access to Afrivate M&amp;E. Review the details below and approve or reject the request in Settings.')}
    ${infoCard(rows)}
    ${button(settingsUrl, 'Review in Settings →', '#E87722')}`

  const text = [
    'New access request for Afrivate M&E',
    '',
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Role requested: ${roleLabel}`,
    request.organisation ? `Organisation: ${request.organisation}` : '',
    '',
    `Review in Settings: ${settingsUrl}`,
  ].filter(Boolean).join('\n')

  const errors: string[] = []
  for (const adminEmail of adminEmails) {
    try {
      await sendMail({
        to: adminEmail,
        subject: `New access request — ${request.name}`,
        preheader: `${request.name} (${request.email}) requested access.`,
        accent: '#E87722',
        html: body,
        text,
      })
    } catch (err) {
      errors.push(`${adminEmail}: ${String((err as Error)?.message ?? err)}`)
    }
  }

  if (errors.length === adminEmails.length) {
    throw new Error(errors.join('; '))
  }
  if (errors.length) {
    throw new Error(`Some admin notifications failed: ${errors.join('; ')}`)
  }
}
