import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  bootstrapped: false,
  initialised: false,

  async init() {
    if (get().initialised) return
    set({ initialised: true, loading: true })

    if (!isSupabaseConfigured) {
      set({ loading: false, bootstrapped: true })
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      await get().applySession(session, { isBootstrap: true })

      supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === 'INITIAL_SESSION') return
        get().applySession(nextSession)
      })
    } catch (err) {
      console.error('Auth init failed:', err)
      set({ session: null, user: null, profile: null, loading: false, bootstrapped: true })
    }
  },

  async applySession(session, { isBootstrap = false } = {}) {
    if (!session?.user) {
      set({ session: null, user: null, profile: null, loading: false, bootstrapped: true })
      return
    }

    const sameUser = get().user?.id === session.user.id

    if (!sameUser) {
      set({ session, user: session.user, profile: null, loading: true })
    } else {
      set({ session, user: session.user })
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      set({ profile: profile ?? null, loading: false, bootstrapped: true })
    } catch (err) {
      console.error('Profile fetch failed:', err)
      set({ profile: sameUser ? get().profile : null, loading: false, bootstrapped: true })
    }

    if (isBootstrap && get().bootstrapped !== true) {
      set({ bootstrapped: true, loading: false })
    }
  },

  /** Refetch profile (e.g. after admin changes role while user is logged in). */
  async refreshProfile() {
    const session = get().session
    if (!session?.user) return
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      set({ profile: profile ?? null })
    } catch (err) {
      console.warn('Profile refresh failed:', err)
    }
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await get().applySession(data.session)
    return data
  },

  async signOut() {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null, loading: false, bootstrapped: true })
    window.dispatchEvent(new Event('afri-clear-cache'))
  },

  async resetPasswordForEmail(email) {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  },

  async sendMagicLink(email) {
    const redirectTo = `${window.location.origin}/dashboard`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })
    if (error) throw error
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  get role() {
    return get().profile?.role ?? null
  },
}))

export const isWriter = (role) => role === 'ADMIN' || role === 'HR'
export const isAdmin = (role) => role === 'ADMIN'

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  HR: 'HR (Read & write)',
  VIEWER: 'Viewer (Read only)',
}
