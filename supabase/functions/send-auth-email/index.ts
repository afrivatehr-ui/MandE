// =============================================================================
// Afrivate M&E — Auth email hook (confirm email, password reset, magic link,
// and security notifications such as password changed).
//
// Enable in Supabase Dashboard → Authentication → Hooks → Send Email → HTTPS:
//   URL: https://<project-ref>.supabase.co/functions/v1/send-auth-email
//   Generate secret → set as SEND_EMAIL_HOOK_SECRET on this function.
//
// Also enable security notifications under Authentication → Email Templates
// (e.g. "Password changed").
//
// Deploy: npx supabase functions deploy send-auth-email --no-verify-jwt
// =============================================================================
import { escapeHtml, parseFrom, sendTransactionalMail, isSmtpConfigured } from '../_shared/mail-transport.ts'
import { verifyAuthHook, type AuthHookEmailData, type AuthHookUser } from '../_shared/auth-hook.ts'
import {
  authConfirmationUrl,
  BRAND,
  button,
  fallbackLink,
  h1,
  p,
  securityAlert,
  shell,
} from '../_shared/email-shell.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '')
const logoUrl = (Deno.env.get('LOGO_URL') ?? `${appUrl}/logos/afrivate-full-logo-purple.png`).replace(/\/$/, '')

const { fromName, fromEmail } = parseFrom(
  Deno.env.get('EMAIL_FROM') ?? 'Afrivate M&E <afrivatehr@gmail.com>',
)

type EmailData = AuthHookEmailData
type AuthUser = AuthHookUser

const SUBJECTS: Record<string, string> = {
  signup: 'Confirm your Afrivate M&E email address',
  recovery: 'Reset your Afrivate M&E password',
  magiclink: 'Your Afrivate M&E sign-in link',
  invite: 'You\'re invited to Afrivate M&E',
  email_change: 'Confirm your new email address',
  email_change_new: 'Confirm your new email address',
  reauthentication: 'Your Afrivate verification code',
  password_changed_notification: 'Your Afrivate M&E password was changed',
  email_changed_notification: 'Your Afrivate M&E email address was changed',
  phone_changed_notification: 'Your Afrivate M&E phone number was changed',
  identity_linked_notification: 'A sign-in method was linked to your Afrivate M&E account',
  identity_unlinked_notification: 'A sign-in method was removed from your Afrivate M&E account',
  mfa_factor_enrolled_notification: 'A verification method was added to your Afrivate M&E account',
  mfa_factor_unenrolled_notification: 'A verification method was removed from your Afrivate M&E account',
}

const SECURITY_NOTIFICATIONS = new Set([
  'password_changed_notification',
  'email_changed_notification',
  'phone_changed_notification',
  'identity_linked_notification',
  'identity_unlinked_notification',
  'mfa_factor_enrolled_notification',
  'mfa_factor_unenrolled_notification',
])

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const hookSecretRaw = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? ''
  if (!hookSecretRaw.trim()) {
    return new Response(JSON.stringify({ error: { message: 'SEND_EMAIL_HOOK_SECRET not configured' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isSmtpConfigured()) {
    return new Response(JSON.stringify({
      error: { message: 'SMTP_USER and SMTP_PASS must be set on this Edge Function.' },
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const payload = await req.text()

  let user: AuthUser
  let email_data: EmailData

  try {
    ;({ user, email_data } = verifyAuthHook(req, payload, hookSecretRaw))
  } catch (err) {
    console.error('send-auth-email hook rejected:', err)
    return new Response(JSON.stringify({ error: { message: String((err as Error)?.message ?? err) } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const action = email_data.email_action_type
    const firstName = (user.user_metadata?.name ?? user.user_metadata?.full_name ?? 'there').split(' ')[0]
    const confirmUrl = SECURITY_NOTIFICATIONS.has(action)
      ? ''
      : authConfirmationUrl(supabaseUrl, email_data)
    const { subject, html, text } = buildAuthEmail(action, {
      firstName,
      confirmUrl,
      token: email_data.token,
      email: user.email,
      emailData: email_data,
    })

    await sendTransactionalMail({
      fromName,
      fromEmail,
      to: user.email,
      subject,
      html,
      text,
      replyTo: fromEmail,
      category: `auth-${action}`,
    })

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-auth-email send failed:', err)
    return new Response(JSON.stringify({ error: { message: String((err as Error)?.message ?? err) } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function buildAuthEmail(
  action: string,
  opts: {
    firstName: string
    confirmUrl: string
    token: string
    email: string
    emailData: EmailData
  },
): { subject: string; html: string; text: string } {
  const { firstName, confirmUrl, token, email, emailData } = opts
  const subject = SUBJECTS[action] ?? 'Afrivate M&E notification'
  const forgotPasswordUrl = `${appUrl}/forgot-password`
  const loginUrl = `${appUrl}/login`
  const changedAt = new Date().toUTCString()

  switch (action) {
    case 'signup': {
      const body = `
        ${h1(`Welcome, ${escapeHtml(firstName)}!`)}
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

    case 'email_change':
    case 'email_change_new': {
      const body = `
        ${h1('Confirm your new email')}
        ${p(`Hi ${firstName}, please confirm your new email address for Afrivate M&amp;E.`)}
        ${button(confirmUrl, 'Confirm new email →', BRAND.purple)}
        ${p('If you did not request this change, you can safely ignore this email.')}
        ${fallbackLink(confirmUrl)}`
      return {
        subject,
        html: shell({
          preheader: 'Confirm your new email address for Afrivate M&E.',
          accent: BRAND.purple,
          body,
          logoUrl,
          footerNote: 'You received this because an email change was requested for your account.',
        }),
        text: `Confirm your new email: ${confirmUrl}\n\nAfriVate Technologies Ltd.`,
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

    case 'password_changed_notification': {
      const body = `
        ${h1('Your password was changed')}
        ${p(`Hi ${firstName}, the password for your Afrivate M&amp;E account (<strong>${email}</strong>) was recently updated.`)}
        ${p(`<strong>When:</strong> ${changedAt}`)}
        ${p('If you made this change, no further action is needed. You can sign in with your new password whenever you are ready.')}
        ${securityAlert('<strong>Did not change your password?</strong> Someone else may have access to your account. Reset your password immediately and contact your Afrivate administrator.')}
        ${button(forgotPasswordUrl, 'Reset my password →', BRAND.orange)}
        ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`
      return {
        subject,
        html: shell({
          preheader: 'Your Afrivate M&E password was recently changed.',
          accent: BRAND.orange,
          body,
          logoUrl,
          footerNote:
            'You received this security notification because the password on your Afrivate M&E account was changed.',
        }),
        text: [
          `Hi ${firstName},`,
          '',
          `The password for your Afrivate M&E account (${email}) was recently changed.`,
          `When: ${changedAt}`,
          '',
          'If you made this change, no action is needed.',
          '',
          'If you did NOT change your password, reset it immediately:',
          forgotPasswordUrl,
          '',
          'AfriVate Technologies Ltd.',
        ].join('\n'),
      }
    }

    case 'email_changed_notification': {
      const oldEmail = emailData.old_email ?? 'your previous address'
      const body = `
        ${h1('Your email address was changed')}
        ${p(`Hi ${firstName}, the email address on your Afrivate M&amp;E account was updated.`)}
        ${p(`<strong>Previous:</strong> ${oldEmail}<br><strong>Current:</strong> ${email}`)}
        ${securityAlert('<strong>Did not make this change?</strong> Contact your Afrivate administrator immediately.')}
        ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`
      return {
        subject,
        html: shell({
          preheader: 'The email address on your Afrivate M&E account was changed.',
          accent: BRAND.orange,
          body,
          logoUrl,
          footerNote: 'You received this security notification because your account email address was changed.',
        }),
        text: `Your email was changed from ${oldEmail} to ${email}.\n\nIf you did not make this change, contact your administrator.\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'identity_linked_notification': {
      const provider = emailData.provider ?? 'a sign-in provider'
      const body = `
        ${h1('Sign-in method linked')}
        ${p(`Hi ${firstName}, <strong>${provider}</strong> was linked to your Afrivate M&amp;E account (${email}).`)}
        ${securityAlert('<strong>Did not link this method?</strong> Contact your Afrivate administrator immediately.')}
        ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`
      return {
        subject,
        html: shell({
          preheader: 'A new sign-in method was linked to your Afrivate M&E account.',
          accent: BRAND.orange,
          body,
          logoUrl,
        }),
        text: `${provider} was linked to ${email}.\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'identity_unlinked_notification': {
      const provider = emailData.provider ?? 'a sign-in provider'
      const body = `
        ${h1('Sign-in method removed')}
        ${p(`Hi ${firstName}, <strong>${provider}</strong> was removed from your Afrivate M&amp;E account (${email}).`)}
        ${securityAlert('<strong>Did not remove this method?</strong> Contact your Afrivate administrator immediately.')}
        ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`
      return {
        subject,
        html: shell({
          preheader: 'A sign-in method was removed from your Afrivate M&E account.',
          accent: BRAND.orange,
          body,
          logoUrl,
        }),
        text: `${provider} was removed from ${email}.\n\nAfriVate Technologies Ltd.`,
      }
    }

    case 'mfa_factor_enrolled_notification':
    case 'mfa_factor_unenrolled_notification': {
      const factor = emailData.factor_type ?? 'verification method'
      const enrolled = action === 'mfa_factor_enrolled_notification'
      const body = `
        ${h1(enrolled ? 'Verification method added' : 'Verification method removed')}
        ${p(`Hi ${firstName}, <strong>${factor}</strong> was ${enrolled ? 'added to' : 'removed from'} your Afrivate M&amp;E account (${email}).`)}
        ${securityAlert('<strong>Was this not you?</strong> Contact your Afrivate administrator immediately.')}
        ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`
      return {
        subject,
        html: shell({
          preheader: enrolled
            ? 'A verification method was added to your Afrivate M&E account.'
            : 'A verification method was removed from your Afrivate M&E account.',
          accent: BRAND.orange,
          body,
          logoUrl,
        }),
        text: `${factor} was ${enrolled ? 'added to' : 'removed from'} ${email}.\n\nAfriVate Technologies Ltd.`,
      }
    }

    default: {
      const body = confirmUrl
        ? `${h1('Action required')}
        ${p('Please follow the link below to continue.')}
        ${button(confirmUrl, 'Continue →', BRAND.purple)}
        ${fallbackLink(confirmUrl)}`
        : `${h1('Account notification')}
        ${p('A change was made to your Afrivate M&amp;E account. If this was unexpected, contact your administrator.')}
        ${button(loginUrl, 'Sign in to Afrivate M&E →', BRAND.purple)}`
      return {
        subject,
        html: shell({ preheader: 'Notification about your Afrivate M&E account.', accent: BRAND.purple, body, logoUrl }),
        text: confirmUrl ? `Continue: ${confirmUrl}` : `Sign in: ${loginUrl}`,
      }
    }
  }
}
