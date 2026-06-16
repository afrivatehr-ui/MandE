import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AuthCard from './auth/AuthCard'

export default function AccountIncomplete() {
  const { signOut } = useAuthStore()

  async function handleSignOut() {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <AuthCard>
      <h1 className="font-heading text-h2 text-afri-purple">Account not ready</h1>
      <p className="afri-muted mt-3 text-sm">
        You are signed in, but your user profile is missing or could not be loaded.
        Please contact an administrator to finish setting up your account.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={handleSignOut} className="afri-btn-primary w-full">
          Sign out
        </button>
        <Link to="/login" className="afri-btn-secondary w-full text-center">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  )
}
