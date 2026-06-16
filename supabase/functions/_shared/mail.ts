import {
  escapeHtml,
  isSmtpConfigured,
  parseFrom,
  sendTransactionalMail,
} from './mail-transport.ts'
import { BRAND, button, h1, infoCard, p, shell } from './email-shell.ts'

export { escapeHtml, isSmtpConfigured, parseFrom }

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  HR: 'HR (Read & write)',
  VIEWER: 'Viewer (Read only)',
}

export const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
export const logoUrl = (Deno.env.get('LOGO_URL') ?? `${appUrl}/logos/afrivate-full-logo-purple.png`).replace(/\/$/, '')

const { fromName, fromEmail } = parseFrom(
  Deno.env.get('EMAIL_FROM') ?? 'Afrivate M&E <afrivatehr@gmail.com>',
)

export function tempPassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text: string
  preheader: string
  accent?: string
  category: string
}) {
  await sendTransactionalMail({
    fromName,
    fromEmail,
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
    category: opts.category,
  })
}

export async function sendWelcomeEmail(to: string, name: string, password: string) {
  const firstName = escapeHtml(name.split(' ')[0] || 'there')
  const safeEmail = escapeHtml(to)
  const loginUrl = `${appUrl}/login`
  const changePasswordUrl = `${appUrl}/forgot-password`

  const body = `
    ${h1(`Welcome, ${firstName}!`)}
    ${p('Your Afrivate Monitoring &amp; Evaluation account is ready. Sign in with the details below, then change your password before you continue.')}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;margin:16px 0;background-color:${BRAND.lavender};border-radius:8px;">
      <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin:0;"><strong>Temporary password:</strong> <code style="font-family:monospace;font-size:15px;">${escapeHtml(password)}</code></p>
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
    category: 'welcome',
    text: [
      `Welcome, ${name.split(' ')[0] || 'there'}!`,
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

export async function sendAccessRequestRejectedEmail(to: string, name: string) {
  const firstName = escapeHtml(name.split(' ')[0] || 'there')
  const body = `
    ${h1('Access request update')}
    ${p(`Hi ${firstName}, thank you for your interest in Afrivate Monitoring &amp; Evaluation.`)}
    ${p('After review, we are unable to approve your access request at this time. If you believe this is a mistake, please contact your Afrivate administrator directly.')}`

  await sendMail({
    to,
    subject: 'Afrivate M&E access request update',
    preheader: 'Your access request was not approved.',
    accent: BRAND.purple,
    html: body,
    category: 'access-rejected',
    text: `Hi ${name.split(' ')[0] || 'there'},\n\nYour access request for Afrivate M&E was not approved at this time.\n\nAfriVate Technologies Ltd.`,
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
    ['Name', escapeHtml(request.name)],
    ['Email', escapeHtml(request.email)],
    ['Role requested', escapeHtml(roleLabel)],
  ]
  if (request.organisation) rows.push(['Organisation', escapeHtml(request.organisation)])

  const body = `
    ${h1('New access request')}
    ${p('Someone has requested access to Afrivate M&amp;E. Review the details below and approve or reject the request in Settings.')}
    ${infoCard(rows)}
    ${button(settingsUrl, 'Review in Settings →', BRAND.orange)}`

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
        accent: BRAND.orange,
        html: body,
        category: 'access-request-admin',
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
