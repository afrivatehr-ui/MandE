import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, isAdmin, isWriter } from '../store/authStore'
import { FullPageSpinner } from './Spinner'
import AccountIncomplete from './AccountIncomplete'

export default function ProtectedRoute({ children, adminOnly = false, writerOnly = false }) {
  const { bootstrapped, loading, session, profile } = useAuthStore()
  const location = useLocation()

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
    return <Navigate to="/dashboard" replace />
  }

  if (writerOnly && !isWriter(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
