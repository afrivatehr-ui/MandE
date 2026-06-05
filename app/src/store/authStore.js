import { create } from 'zustand'
import { supabase } from '../lib/supabase'

/**
 * Auth + profile (role) state. The session comes from Supabase Auth; the role
 * (ADMIN / HR / VIEWER) is read from the `profiles` table.
 */
export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialised: false,

  async init() {
    if (get().initialised) return
    set({ initialised: true })

    const {
      data: { session },
    } = await supabase.auth.getSession()
    await get().applySession(session)

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      get().applySession(nextSession)
    })
  },

  async applySession(session) {
    if (!session?.user) {
      set({ session: null, user: null, profile: null, loading: false })
      return
    }
    set({ session, user: session.user })
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('id', session.user.id)
      .single()
    set({ profile: profile ?? null, loading: false })
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await get().applySession(data.session)
    return data
  },

  async signOut() {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  // Convenience role checks (mirrors RLS in the database).
  get role() {
    return get().profile?.role ?? null
  },
}))

export const isWriter = (role) => role === 'ADMIN' || role === 'HR'
export const isAdmin = (role) => role === 'ADMIN'
