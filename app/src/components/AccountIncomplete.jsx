import AuthCard from './auth/AuthCard'
import { useAuthStore } from '../store/authStore'

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
        Please contact an administrator to finish setting up your account, then sign in again.
      </p>
      <button type="button" onClick={handleSignOut} className="afri-btn-primary mt-6 w-full">
        Sign out
      </button>
    </AuthCard>
  )
}
