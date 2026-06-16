// =============================================================================
// Afrivate M&E - Admin user management (ADMIN only).
//
//   POST { action: 'create', email, name, role }
//   POST { action: 'approve_request', request_id, role }
//   POST { action: 'update_role', user_id, role }
//   POST { action: 'reject_request', request_id }
//   POST { action: 'delete', user_id }
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWelcomeEmail, sendAccessRequestRejectedEmail, tempPassword } from '../_shared/mail.ts'

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

async function createStaffUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  name: string,
  role: string,
  password: string,
) {
  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name, role },
  })
  if (error) throw new Error(error.message)

  await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true })
  await admin.from('profiles').update({ role, name, email: email.trim().toLowerCase() }).eq('id', data.user.id)

  try {
    await sendWelcomeEmail(email.trim().toLowerCase(), name, password)
  } catch (mailErr) {
    return { id: data.user.id, emailSent: false, mailError: String((mailErr as Error)?.message ?? mailErr) }
  }

  return { id: data.user.id, emailSent: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405)

  const admin = createClient(supabaseUrl, serviceKey)

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) return json({ success: false, error: 'Not authenticated.' }, 401)
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'ADMIN') return json({ success: false, error: 'Admin access required.' }, 403)

  try {
    const body = await req.json().catch(() => null)
    if (!body?.action) return json({ success: false, error: 'Missing action.' }, 400)

    if (body.action === 'create') {
      const { email, name, role } = body
      if (!email || !name) return json({ success: false, error: 'Email and name are required.' }, 400)
      if (!['ADMIN', 'HR', 'VIEWER'].includes(role)) return json({ success: false, error: 'Invalid role.' }, 400)

      const normalizedEmail = String(email).trim().toLowerCase()
      const { data: existing } = await admin.from('profiles').select('id').ilike('email', normalizedEmail).maybeSingle()
      if (existing) return json({ success: false, error: 'An account with this email already exists.' }, 400)

      const password = tempPassword()
      const result = await createStaffUser(admin, email, name, role, password)
      if (!result.emailSent) {
        return json({
          success: true,
          data: result,
          warning: `User created but email could not be sent: ${result.mailError}. Share the login details manually.`,
        })
      }
      return json({ success: true, data: result })
    }

    if (body.action === 'approve_request') {
      const { request_id: requestId, role } = body
      if (!requestId) return json({ success: false, error: 'Missing request_id.' }, 400)
      if (!['ADMIN', 'HR', 'VIEWER'].includes(role)) return json({ success: false, error: 'Invalid role.' }, 400)

      const { data: reqRow, error: reqErr } = await admin
        .from('access_requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'PENDING')
        .single()

      if (reqErr || !reqRow) return json({ success: false, error: 'Pending access request not found.' }, 404)

      const password = tempPassword()
      let userId = reqRow.user_id as string | null

      if (userId) {
        const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        })
        if (pwErr) throw new Error(pwErr.message)
        await admin.from('profiles').update({ role, name: reqRow.name }).eq('id', userId)
        try {
          await sendWelcomeEmail(reqRow.email, reqRow.name, password)
        } catch (mailErr) {
          return json({
            success: false,
            error: `Approved role but could not email user: ${String((mailErr as Error)?.message ?? mailErr)}`,
          }, 500)
        }
      } else {
        const created = await createStaffUser(admin, reqRow.email, reqRow.name, role, password)
        userId = created.id
        if (!created.emailSent) {
          return json({
            success: true,
            data: { id: userId, emailSent: false },
            warning: `User created but email failed: ${created.mailError}. Share the login details manually.`,
          })
        }
      }

      const { error: updErr } = await admin
        .from('access_requests')
        .update({ status: 'APPROVED', reviewed_at: new Date().toISOString(), user_id: userId })
        .eq('id', requestId)

      if (updErr) {
        if (!reqRow.user_id && userId) {
          await admin.auth.admin.deleteUser(userId).catch(() => {})
        }
        return json({ success: false, error: updErr.message }, 400)
      }
      return json({ success: true, data: { id: userId, emailSent: true } })
    }

    if (body.action === 'update_role') {
      const { user_id: userId, role } = body
      if (!userId || !role) return json({ success: false, error: 'Missing user_id or role.' }, 400)
      if (userId === user.id) return json({ success: false, error: 'You cannot change your own role here.' }, 400)
      if (!['ADMIN', 'HR', 'VIEWER'].includes(role)) return json({ success: false, error: 'Invalid role.' }, 400)

      const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
      if (error) return json({ success: false, error: error.message }, 400)
      return json({ success: true, data: { updated: userId, role } })
    }

    if (body.action === 'reject_request') {
      const requestId = body.request_id
      if (!requestId) return json({ success: false, error: 'Missing request_id.' }, 400)

      const { data: reqRow, error: reqErr } = await admin
        .from('access_requests')
        .select('*')
        .eq('id', requestId)
        .eq('status', 'PENDING')
        .single()

      if (reqErr || !reqRow) return json({ success: false, error: 'Pending access request not found.' }, 404)

      const { error: updErr } = await admin
        .from('access_requests')
        .update({ status: 'REJECTED', reviewed_at: new Date().toISOString() })
        .eq('id', requestId)

      if (updErr) return json({ success: false, error: updErr.message }, 400)

      let emailSent = false
      try {
        await sendAccessRequestRejectedEmail(reqRow.email, reqRow.name)
        emailSent = true
      } catch {
        // Request is rejected even if email fails.
      }

      return json({ success: true, data: { rejected: requestId, emailSent } })
    }

    if (body.action === 'delete') {
      if (!body.user_id) return json({ success: false, error: 'Missing user_id.' }, 400)
      if (body.user_id === user.id) return json({ success: false, error: 'You cannot remove your own account.' }, 400)

      const userId = body.user_id as string

      const { data: targetProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle()

      const { error: authErr } = await admin.auth.admin.deleteUser(userId)
      if (authErr) return json({ success: false, error: authErr.message }, 400)

      await admin.from('access_requests').delete().eq('user_id', userId)
      if (targetProfile?.email) {
        await admin.from('access_requests').delete().eq('email', targetProfile.email)
      }
      await admin.from('profiles').delete().eq('id', userId)

      return json({ success: true, data: { deleted: userId } })
    }

    return json({ success: false, error: 'Unknown action.' }, 400)
  } catch (err) {
    return json({ success: false, error: String((err as Error)?.message ?? err) }, 500)
  }
})
