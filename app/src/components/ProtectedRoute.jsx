import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuthStore, isAdmin, isWriter } from '../store/authStore'
import { toast } from '../store/toastStore'
import { FullPageSpinner } from './Spinner'
import AccountIncomplete from './AccountIncomplete'

export default function ProtectedRoute({ children, adminOnly = false, writerOnly = false }) {
  const { bootstrapped, loading, session, profile } = useAuthStore()
  const location = useLocation()
  const deniedRef = useRef(false)

  useEffect(() => {
    deniedRef.current = false
  }, [location.pathname, profile?.role])

  if (!bootstrapped || (loading && !profile)) {
    return <FullPageSpinner />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!profile) {
    return <AccountIncomplete />
  }

  if (adminOnly && !isAdmin(profile.role)) {
    if (!deniedRef.current) {
      deniedRef.current = true
      toast.info('Administrator access is required for that page.')
    }
    return <Navigate to="/dashboard" replace />
  }

  if (writerOnly && !isWriter(profile.role)) {
    if (!deniedRef.current) {
      deniedRef.current = true
      toast.info('You have read-only access and cannot open that page.')
    }
    return <Navigate to="/dashboard" replace />
  }

  return children
}
