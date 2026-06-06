import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'

const IDLE_MS = 10 * 60 * 1000 // 10 minutes

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click']

/**
 * Signs the user out after 10 minutes without interaction.
 * Also checks elapsed idle time when the tab becomes visible again.
 */
export function useIdleLogout() {
  const session = useAuthStore((s) => s.session)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const lastActiveRef = useRef(Date.now())
  const timeoutRef = useRef(null)
  const signingOutRef = useRef(false)

  useEffect(() => {
    if (!session) return undefined

    lastActiveRef.current = Date.now()
    signingOutRef.current = false

    async function logoutIdle() {
      if (signingOutRef.current) return
      signingOutRef.current = true
      clearTimeout(timeoutRef.current)
      await signOut()
      toast.info('You were signed out after 10 minutes of inactivity.')
      navigate('/login', { replace: true, state: { reason: 'idle' } })
    }

    function scheduleLogout() {
      clearTimeout(timeoutRef.current)
      const remaining = IDLE_MS - (Date.now() - lastActiveRef.current)
      timeoutRef.current = setTimeout(logoutIdle, Math.max(0, remaining))
    }

    function recordActivity() {
      lastActiveRef.current = Date.now()
      scheduleLogout()
    }

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActiveRef.current >= IDLE_MS) {
        logoutIdle()
      } else {
        scheduleLogout()
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibilityChange)
    scheduleLogout()

    return () => {
      clearTimeout(timeoutRef.current)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [session, signOut, navigate])
}
