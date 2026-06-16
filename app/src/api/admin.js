import { supabase } from '../lib/supabase'

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
  if (error) throw error
  return data
}

export async function updateUserRole(id, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) throw error
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
  if (error) throw error
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
  const { error } = await supabase
    .from('access_requests')
    .update({ status: 'REJECTED', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) throw error
}
