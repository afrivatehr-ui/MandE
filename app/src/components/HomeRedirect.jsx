import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { FullPageSpinner } from './Spinner'

/** Send visitors to login or dashboard depending on session — never assume dashboard. */
export default function HomeRedirect() {
  const { session, loading } = useAuthStore()
  if (loading) return <FullPageSpinner />
  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}
