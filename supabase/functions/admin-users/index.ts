// =============================================================================
// Afrivate M&E - Admin user management (ADMIN only).
//
//   POST { action: 'create', email, name, role, password }
//   POST { action: 'delete', user_id }
//
// Uses the service-role key for the Auth admin API. The caller must be an
// authenticated ADMIN. Profiles are created by the on_auth_user_created trigger
// and removed via the on-delete-cascade FK.
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405)

  const admin = createClient(supabaseUrl, serviceKey)

  // AuthZ: ADMIN only.
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
      const { email, name, role, password } = body
      if (!email || !password || !name) return json({ success: false, error: 'Email, name and password are required.' }, 400)
      if (!['ADMIN', 'HR', 'VIEWER'].includes(role)) return json({ success: false, error: 'Invalid role.' }, 400)
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      })
      if (error) return json({ success: false, error: error.message }, 400)
      // Ensure the profile reflects the chosen role (in case the trigger defaulted).
      await admin.from('profiles').update({ role, name }).eq('id', data.user.id)
      return json({ success: true, data: { id: data.user.id } })
    }

    if (body.action === 'delete') {
      if (!body.user_id) return json({ success: false, error: 'Missing user_id.' }, 400)
      if (body.user_id === user.id) return json({ success: false, error: 'You cannot remove your own account.' }, 400)
      const { error } = await admin.auth.admin.deleteUser(body.user_id)
      if (error) return json({ success: false, error: error.message }, 400)
      return json({ success: true, data: { deleted: body.user_id } })
    }

    return json({ success: false, error: 'Unknown action.' }, 400)
  } catch (err) {
    return json({ success: false, error: String((err as Error)?.message ?? err) }, 500)
  }
})
