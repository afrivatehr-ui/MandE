import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, isAdmin } from '../store/authStore'
import { FullPageSpinner } from './Spinner'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { bootstrapped, loading, session, profile } = useAuthStore()
  const location = useLocation()

  if (!bootstrapped || (loading && !profile)) {
    return <FullPageSpinner />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (adminOnly && !isAdmin(profile?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
