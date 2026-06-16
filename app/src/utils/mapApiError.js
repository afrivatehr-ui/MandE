/** Map PostgREST / Supabase errors to user-friendly messages. */
export function mapApiError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const code = error.code
  const message = error.message || ''

  if (code === 'PGRST116') return 'Record not found.'
  if (code === '42501') return 'You do not have permission to do that.'
  if (code === '23505') return 'This record already exists.'
  if (/Only administrators can change user roles/i.test(message)) return message
  if (/deployment has been removed/i.test(message)) return 'This deployment has been removed.'
  if (/JWT expired/i.test(message)) return 'Your session expired. Please sign in again.'
  if (/Failed to fetch|NetworkError/i.test(message)) return 'Could not reach the server. Check your connection.'

  return message || 'Something went wrong. Please try again.'
}

export function safePath(path) {
  if (typeof path !== 'string') return '/dashboard'
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard'
  return path
}

export async function copyToClipboard(text) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Copy is not supported in this browser.')
  }
  await navigator.clipboard.writeText(text)
}
