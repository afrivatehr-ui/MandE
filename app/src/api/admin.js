import { supabase } from '../lib/supabase'
import { mapApiError } from '../utils/mapApiError'

function parseFunctionError(data, error) {
  if (data?.error) return data.error
  if (data?.success === false) return data.error || 'Something went wrong. Please try again.'
  if (error?.message) return error.message
  return 'Something went wrong. Please try again.'
}

function unwrapInvoke(result) {
  const { data, error } = result
  if (data?.success === false) throw new Error(parseFunctionError(data, error))
  if (error && !data?.success) throw new Error(parseFunctionError(data, error))
  return data
}

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .order('created_at')
  if (error) throw new Error(mapApiError(error))
  return data
}

export async function updateUserRole(id, role) {
  const result = await supabase.functions.invoke('admin-users', {
    body: { action: 'update_role', user_id: id, role },
  })
  unwrapInvoke(result)
}

export async function adminCreateUser({ email, name, role }) {
  const result = await supabase.functions.invoke('admin-users', {
    body: { action: 'create', email, name, role },
  })
  const data = unwrapInvoke(result)
  if (data?.warning) return { ...data.data, warning: data.warning }
  return data?.data ?? data
}

export async function adminDeleteUser(userId) {
  const result = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', user_id: userId },
  })
  const data = unwrapInvoke(result)
  return data?.data ?? data
}

export async function fetchAccessRequests() {
  const { data, error } = await supabase
    .from('access_requests')
    .select('id, user_id, email, name, organisation, role_requested, status, created_at')
    .eq('status', 'PENDING')
    .order('created_at')
  if (error) throw new Error(mapApiError(error))
  return data
}

export async function approveAccessRequest(requestId, approveRole) {
  const result = await supabase.functions.invoke('admin-users', {
    body: { action: 'approve_request', request_id: requestId, role: approveRole },
  })
  const data = unwrapInvoke(result)
  if (data?.warning) return { warning: data.warning, ...data.data }
  return data?.data ?? data
}

export async function rejectAccessRequest(requestId) {
  const result = await supabase.functions.invoke('admin-users', {
    body: { action: 'reject_request', request_id: requestId },
  })
  const data = unwrapInvoke(result)
  return data?.data ?? data
}

export async function fetchAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('survey_token_expiry_days')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return { survey_token_expiry_days: 14 }
    throw new Error(mapApiError(error))
  }
  return data ?? { survey_token_expiry_days: 14 }
}

export async function updateAppSettings(patch) {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('survey_token_expiry_days')
    .single()
  if (error) throw new Error(mapApiError(error))
  return data
}
