import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced early so a missing .env is obvious in dev rather than a cryptic 401 later.
  console.error(
    'Missing Supabase env vars. Copy app/.env.example to app/.env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

// Base URL for invoking Edge Functions (public survey + email dispatch).
export const FUNCTIONS_URL = supabaseUrl ? `${supabaseUrl}/functions/v1` : ''
