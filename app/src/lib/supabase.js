import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

/** False when Vite env vars were not set at build time (common Netlify misconfiguration). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Missing Supabase env vars. Copy app/.env.example to app/.env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

/** Remove old localStorage sessions so closing-tab / session-only auth is enforced. */
export function clearLegacyAuthStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.includes('auth')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    /* ignore storage errors */
  }
}

clearLegacyAuthStorage()

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    // sessionStorage: session ends when the browser tab/window is closed.
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Base URL for invoking Edge Functions (public survey + email dispatch).
export const FUNCTIONS_URL = supabaseUrl ? `${supabaseUrl}/functions/v1` : ''
