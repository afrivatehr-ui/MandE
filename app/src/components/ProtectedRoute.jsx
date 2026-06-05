import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, isAdmin } from '../store/authStore'
import { FullPageSpinner } from './Spinner'

/**
 * Guards authenticated app routes. Pass adminOnly for ADMIN-restricted pages
 * (e.g. Settings). Read-only enforcement for VIEWER happens per-action in the
 * pages, mirroring the database RLS.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { loading, session, profile } = useAuthStore()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (adminOnly && !isAdmin(profile?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
