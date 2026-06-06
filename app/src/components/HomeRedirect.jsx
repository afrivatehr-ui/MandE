import { Navigate } from 'react-router-dom'

/** Root URL always lands on the login page; Login redirects authenticated users. */
export default function HomeRedirect() {
  return <Navigate to="/login" replace />
}