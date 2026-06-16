import nodemailer from 'npm:nodemailer@6.9.15'

const smtpHost = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '587')
const smtpUser = Deno.env.get('SMTP_USER') ?? ''
const smtpPass = Deno.env.get('SMTP_PASS') ?? ''

export function parseFrom(s: string): { fromName?: string; fromEmail: string } {
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/)
  if (m) return { fromName: m[1] || undefined, fromEmail: m[2] }
  return { fromEmail: s.trim() }
}

export function isSmtpConfigured() {
  return Boolean(smtpUser && smtpPass)
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function messageId(fromEmail: string) {
  const domain = fromEmail.split('@')[1] || 'afrivate.com'
  return `<${crypto.randomUUID()}@${domain}>`
}

let cached: ReturnType<typeof nodemailer.createTransport> | null = null

function transporter() {
  if (!isSmtpConfigured()) {
    throw new Error('Email is not configured on the server (SMTP_USER / SMTP_PASS).')
  }
  if (!cached) {
    cached = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })
  }
  return cached
}

export type SendMailOpts = {
  fromName?: string
  fromEmail: string
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  /** e.g. auth, survey-invite, access-request */
  category?: string
}

/** Send with headers that improve deliverability for transactional mail. */
export async function sendTransactionalMail(opts: SendMailOpts) {
  const from = opts.fromName ? `"${opts.fromName}" <${opts.fromEmail}>` : opts.fromEmail
  const id = messageId(opts.fromEmail)

  await transporter().sendMail({
    from,
    to: opts.to,
    replyTo: opts.replyTo ?? opts.fromEmail,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    messageId: id,
    headers: {
      'Message-ID': id,
      'X-Mailer': 'Afrivate M&E',
      'X-Auto-Response-Suppress': 'All',
      ...(opts.category ? { 'X-Entity-Ref-ID': opts.category } : {}),
    },
  })
}
