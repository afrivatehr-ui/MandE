// =============================================================================
// Public access request — saves to admin queue and emails all administrators.
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isSmtpConfigured, notifyAdminsOfAccessRequest } from '../_shared/mail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405)

  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const name = String(body?.name ?? '').trim()
    const organisation = String(body?.organisation ?? '').trim() || null
    const roleRequested = String(body?.role_requested ?? 'VIEWER').toUpperCase()

    if (!email || !name) return json({ success: false, error: 'Email and full name are required.' }, 400)
    if (!['ADMIN', 'HR', 'VIEWER'].includes(roleRequested)) {
      return json({ success: false, error: 'Invalid role requested.' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: existingProfile } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle()
    if (existingProfile) {
      return json({ success: false, error: 'An account with this email already exists. Try signing in.' }, 400)
    }

    const { data: pending } = await admin
      .from('access_requests')
      .select('id')
      .ilike('email', email)
      .eq('status', 'PENDING')
      .maybeSingle()

    if (pending) {
      return json({ success: false, error: 'A pending access request already exists for this email.' }, 400)
    }

    const { data, error } = await admin
      .from('access_requests')
      .insert({
        email,
        name,
        organisation,
        role_requested: roleRequested,
        status: 'PENDING',
      })
      .select('id')
      .single()

    if (error) return json({ success: false, error: error.message }, 400)

    let adminEmails: string[] = []
    const { data: admins } = await admin.from('profiles').select('email').eq('role', 'ADMIN')
    adminEmails = (admins ?? []).map((a) => String(a.email).trim().toLowerCase()).filter(Boolean)

    const extraNotify = (Deno.env.get('ADMIN_NOTIFY_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    adminEmails = [...new Set([...adminEmails, ...extraNotify])]

    let emailWarning: string | undefined
    if (!isSmtpConfigured()) {
      emailWarning = 'Your request was saved, but email notifications are not configured on the server.'
    } else if (!adminEmails.length) {
      emailWarning = 'Your request was saved, but no administrator email addresses were found to notify.'
    } else {
      try {
        await notifyAdminsOfAccessRequest(adminEmails, {
          name,
          email,
          organisation,
          roleRequested,
        })
      } catch (mailErr) {
        emailWarning = `Your request was saved, but we could not notify administrators: ${String((mailErr as Error)?.message ?? mailErr)}`
      }
    }

    if (emailWarning) {
      return json({ success: true, data: { id: data.id }, warning: emailWarning })
    }

    return json({ success: true, data: { id: data.id } })
  } catch (err) {
    return json({ success: false, error: String((err as Error)?.message ?? err) }, 500)
  }
})
