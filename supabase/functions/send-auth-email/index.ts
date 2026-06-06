// =============================================================================
// Afrivate M&E — Auth email hook (confirm email, password reset, magic link).
//
// Enable in Supabase Dashboard → Authentication → Hooks → Send Email → HTTPS:
//   URL: https://<project-ref>.supabase.co/functions/v1/send-auth-email
//   Generate secret → set as SEND_EMAIL_HOOK_SECRET on this function.
//
// Deploy: supabase functions deploy send-auth-email --no-verify-jwt
// =============================================================================
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import nodemailer from 'npm:nodemailer@6.9.15'
import {
  authConfirmationUrl,
  BRAND,
  button,
  fallbackLink,
  h1,
  p,
  shell,
} from '../_shared/email-shell.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const smtpHost = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '587')
const smtpUser = Deno.env.get('SMTP_USER') ?? ''
const smtpPass = Deno.env.get('SMTP_PASS') ?? ''
const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
const logoUrl = (Deno.env.get('LOGO_URL') ?? `${appUrl}/logos/afrivate-full-logo-purple.png`).replace(/\/$/, '')

function parseFrom(s: string): { fromName?: string; fromEmail: string } {
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/)
  if (m) return { fromName: m[1] || undefined, fromEmail: m[2] }
  return { fromEmail: s.trim() }
}

const { fromName, fromEmail } = parseFrom(
  Deno.env.get('EMAIL_FROM') ?? 'Afrivate M&E <afrivatehr@gmail.com>',
)

type EmailData = {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
  token_new: string
  token_hash_new: string
}

type AuthUser = {
  email: string
  user_metadata?: { name?: string; full_name?: string }
}

const SUBJECTS: Record<string, string> = {
  signup: 'Confirm your Afrivate M&E email address',
  recovery: 'Reset your Afrivate M&E password',
  magiclink: 'Your Afrivate M&E sign-in link',
  invite: 'You\'re invited to Afrivate M&E',
  email_change: 'Confirm your new email address',
  email_change_new: 'Confirm your new email address',
  reauthentication: 'Your Afrivate verification code',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const hookSecretRaw = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? ''
  if (!hookSecretRaw) {
    return new Response(JSON.stringify({ error: { message: 'SEND_EMAIL_HOOK_SECRET not configured' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const hookSecret = hookSecretRaw.replace(/^v1,whsec_/, '')
  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  let user: AuthUser
  let email_data: EmailData

  try {
    const wh = new Webhook(hookSecret)
    ;({ user, email_data } = wh.verify(payload, headers) as { user: AuthUser; email_data: EmailData })
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: String((err as Error)?.message ?? err) } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const action = email_data.email_action_type
  const confirmUrl = authConfirmationUrl(supabaseUrl, email_data)
  const firstName = (user.user_metadata?.name ?? user.user_metadata?.full_name ?? 'there').split(' ')[0]
  const { subject, html, text } = buildAuthEmail(action, { firstName, confirmUrl, token: email_data.token })

  try {
    if (!smtpUser || !smtpPass) {
      throw new Error('SMTP_USER and SMTP_PASS must be set on the Edge Function.')
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to: user.email,
      subject,
      html,
      text,
      replyTo: fromEmail,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: String((err as Error)?.message ?? err) } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

function buildAuthEmail(
  action: string,
  opts: { firstName: string; confirmUrl: string; token: string },
): { subject: string; html: string; text: string } {
  const { firstName, confirmUrl, token } = opts
  const subject = SUBJECTS[action] ?? 'Afrivate M&E notification'

  switch (action) {
    case 'signup': {
      const body = `
        ${h1(`Welcome, ${firstName}!`)}
        ${p('Thanks for requesting access to the Afrivate Monitoring &amp; Evaluation platform. Please confirm your email address to complete registration. An administrator will review your access request after confirmation.')}
        ${button(confirmUrl, 'Confirm my email →', BRAND.purple)}
        ${p('This link expires shortly and can only be used once.')}
        ${fallbackLink(confirmUrl)}`
      return {
        subject,
        html: shell({
          preheader: 'Confirm your email to finish signing up for Afrivate M&E.',
          accent: BRAND.purple,
          body,
          logoUrl,
          footerNote:
            'You received this because someone signed up for Afrivate M&E with this email address.',
        }),
        text: `Welcome, ${firstName}!\n\nConfirm your email: ${confirmUrl}\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'recovery': {
      const body = `
        ${h1('Reset your password')}
        ${p(`Hi ${firstName}, we received a request to reset the password for your Afrivate M&amp;E account. Click below to choose a new password.`)}
        ${button(confirmUrl, 'Reset password →', BRAND.blue)}
        ${p('If you did not request this, you can safely ignore this email — your password will not change.')}
        ${fallbackLink(confirmUrl)}`
      return {
        subject,
        html: shell({
          preheader: 'Reset your Afrivate M&E password — link expires shortly.',
          accent: BRAND.blue,
          body,
          logoUrl,
          footerNote: 'You received this because a password reset was requested for your account.',
        }),
        text: `Reset your password: ${confirmUrl}\n\nIf you did not request this, ignore this email.\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'magiclink': {
      const body = `
        ${h1('Your sign-in link')}
        ${p(`Hi ${firstName}, use the button below to sign in to Afrivate M&amp;E. No password needed — this secure link works once and expires shortly.`)}
        ${button(confirmUrl, 'Sign in to Afrivate M&E →', BRAND.green)}
        ${p('If you did not request this link, you can safely ignore this email.')}
        ${fallbackLink(confirmUrl)}`
      return {
        subject,
        html: shell({
          preheader: 'Sign in to Afrivate M&E with your one-time magic link.',
          accent: BRAND.green,
          body,
          logoUrl,
          footerNote: 'You received this because a magic link sign-in was requested for your account.',
        }),
        text: `Sign in: ${confirmUrl}\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'invite': {
      const body = `
        ${h1('You\'re invited!')}
        ${p(`${firstName}, you've been invited to join the Afrivate Monitoring &amp; Evaluation platform. Accept the invitation below to set up your account.`)}
        ${button(confirmUrl, 'Accept invitation →', BRAND.purple)}
        ${fallbackLink(confirmUrl)}`
      return {
        subject,
        html: shell({
          preheader: 'Accept your invitation to Afrivate M&E.',
          accent: BRAND.purple,
          body,
          logoUrl,
        }),
        text: `Accept invitation: ${confirmUrl}\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'reauthentication': {
      const body = `
        ${h1('Verification code')}
        ${p('Use this code to verify your identity. It expires shortly.')}
        <p style="margin:16px 0;font-family:Poppins,Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:6px;color:${BRAND.purple};text-align:center;">${token}</p>`
      return {
        subject,
        html: shell({
          preheader: `Your verification code: ${token}`,
          accent: BRAND.purple,
          body,
          logoUrl,
        }),
        text: `Your verification code: ${token}`,
      }
    }

    default: {
      const body = `
        ${h1('Action required')}
        ${p('Please follow the link below to continue.')}
        ${button(confirmUrl, 'Continue →', BRAND.purple)}
        ${fallbackLink(confirmUrl)}`
      return {
        subject,
        html: shell({ preheader: 'Action required on your Afrivate M&E account.', accent: BRAND.purple, body, logoUrl }),
        text: `Continue: ${confirmUrl}`,
      }
    }
  }
}
