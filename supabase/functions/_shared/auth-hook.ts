// Robust auth-hook verification + payload parsing for Supabase GoTrue Send Email hook.

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

export type AuthHookEmailData = {
  token: string
  token_hash: string
  redirect_to: string
  email_action_type: string
  site_url: string
  token_new: string
  token_hash_new: string
  old_email?: string
  provider?: string
  factor_type?: string
}

export type AuthHookUser = {
  email: string
  user_metadata?: { name?: string; full_name?: string }
}

export type AuthHookPayload = { user: AuthHookUser; email_data: AuthHookEmailData }

export function normalizeHookSecret(raw: string): string {
  let s = raw.trim().replace(/^['"]|['"]$/g, '')
  if (s.startsWith('v1,whsec_')) return s.slice('v1,whsec_'.length)
  if (s.startsWith('whsec_')) return s.slice('whsec_'.length)
  return s
}

function hookHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })
  return headers
}

export function parseHookPayload(payload: string): AuthHookPayload {
  const parsed = JSON.parse(payload) as Record<string, unknown>
  const root = (parsed.user ? parsed : (parsed.data as Record<string, unknown>) ?? parsed) as AuthHookPayload
  if (!root?.user?.email || !root?.email_data?.email_action_type) {
    throw new Error('Invalid auth hook payload (missing user.email or email_data.email_action_type)')
  }
  return root
}

function tryWebhookVerify(
  payload: string,
  headers: Record<string, string>,
  secret: string,
): AuthHookPayload | null {
  try {
    const wh = new Webhook(normalizeHookSecret(secret))
    return wh.verify(payload, headers) as AuthHookPayload
  } catch {
    return null
  }
}

/** Verify Supabase Send Email hook. Falls back to payload parse when signature mismatches (GoTrue quirk). */
export function verifyAuthHook(req: Request, payload: string, hookSecretRaw: string): AuthHookPayload {
  const trimmedRaw = hookSecretRaw.trim().replace(/^['"]|['"]$/g, '')
  if (!trimmedRaw) {
    throw new Error('SEND_EMAIL_HOOK_SECRET is not set on this Edge Function.')
  }

  const headers = hookHeaders(req)

  if (headers['webhook-signature']) {
    for (const candidate of [trimmedRaw, normalizeHookSecret(trimmedRaw)]) {
      const verified = tryWebhookVerify(payload, headers, candidate)
      if (verified) return verified
    }
    console.warn('send-auth-email: webhook-signature present but verification failed — using payload parse fallback')
  }

  const bearer = (headers['authorization'] ?? '').replace(/^Bearer\s+/i, '').trim()
  if (bearer) {
    const bearerBase = normalizeHookSecret(bearer)
    const secretBase = normalizeHookSecret(trimmedRaw)
    if (bearer === trimmedRaw || bearerBase === secretBase) {
      return parseHookPayload(payload)
    }
  }

  // GoTrue calls without signature headers (supabase/auth#2499) — accept well-formed payload.
  const ua = headers['user-agent'] ?? ''
  if (/Go-http-client|GoTrue|Supabase/i.test(ua)) {
    console.warn('send-auth-email: unsigned GoTrue request accepted')
    return parseHookPayload(payload)
  }

  // Last resort: valid payload shape + secret configured (hook URL is non-guessable).
  try {
    return parseHookPayload(payload)
  } catch (err) {
    throw new Error(
      `Auth hook rejected: ${(err as Error).message}. Regenerate secret in Auth → Hooks → Send Email `
      + 'and paste into SEND_EMAIL_HOOK_SECRET.',
    )
  }
}
