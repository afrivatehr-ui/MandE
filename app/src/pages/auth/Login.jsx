import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Logo from '../../components/Logo'
import Spinner from '../../components/Spinner'

export default function Login() {
  const { signIn, session, loading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from || '/dashboard'

  if (!loading && session) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
      <div className="w-full max-w-md overflow-hidden rounded-card bg-afri-white shadow-card">
        <div className="flex flex-col items-center gap-3 bg-afri-purple px-8 py-10">
          <Logo variant="white" className="w-[180px]" />
          <p className="font-body text-sm text-afri-white/80">Monitoring &amp; Evaluation Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8">
          <h1 className="font-heading text-h2 text-afri-purple">Sign in</h1>

          {error && (
            <div className="rounded-lg border border-afri-red/30 bg-afri-red/5 px-4 py-3 text-sm text-afri-red">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="afri-label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="afri-input"
              placeholder="you@afrivate.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="afri-label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="afri-input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={submitting} className="afri-btn-primary mt-2 w-full">
            {submitting ? <Spinner /> : 'Sign in'}
          </button>

          <p className="text-center text-sm text-afri-gray-600">
            Don't have an account?{' '}
            <a href="/signup" className="font-semibold text-afri-purple hover:underline">
              Request access
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
