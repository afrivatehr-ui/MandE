import { supabase } from '../lib/supabase'

function unwrapFunctionResponse(data) {
  if (data && data.success === false) throw new Error(data.error || 'Request failed.')
  return data
}

export async function submitAccessRequest({ email, name, organisation, role_requested }) {
  const { data, error } = await supabase.functions.invoke('request-access', {
    body: { email, name, organisation, role_requested },
  })
  if (error) throw new Error(error.message || 'Could not submit access request.')
  const result = unwrapFunctionResponse(data)
  return { id: result?.data?.id, warning: result?.warning }
}
