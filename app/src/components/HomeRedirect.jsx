import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { FullPageSpinner } from './Spinner'

/** Root URL: wait for auth, then dashboard if signed in or login if not — avoids login flicker. */
export default function HomeRedirect() {
  const { bootstrapped, session } = useAuthStore()
  if (!bootstrapped) return <FullPageSpinner />
  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}
