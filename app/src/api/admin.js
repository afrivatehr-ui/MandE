import { supabase } from '../lib/supabase'

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

export async function adminCreateUser({ email, name, role, password }) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'create', email, name, role, password },
  })
  if (error) throw new Error(error.message)
  if (data && data.success === false) throw new Error(data.error)
  return data
}

export async function adminDeleteUser(userId) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'delete', user_id: userId },
  })
  if (error) throw new Error(error.message)
  if (data && data.success === false) throw new Error(data.error)
  return data
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
  const { data, error } = await supabase.from('access_requests')
    .select('user_id')
    .eq('id', requestId)
    .single()

  if (error) throw error

  const userId = data.user_id

  // Update profile with approved role
  const { error: profileError } = await supabase.from('profiles')
    .update({ role: approveRole })
    .eq('id', userId)

  if (profileError) throw profileError

  // Mark request as approved
  const { error: requestError } = await supabase.from('access_requests')
    .update({ status: 'APPROVED', reviewed_at: new Date() })
    .eq('id', requestId)

  if (requestError) throw requestError
}

export async function rejectAccessRequest(requestId) {
  const { error } = await supabase.from('access_requests')
    .update({ status: 'REJECTED', reviewed_at: new Date() })
    .eq('id', requestId)

  if (error) throw error
}
