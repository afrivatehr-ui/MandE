import { useState } from 'react'
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/auth/AuthCard'
import PasswordInput from '../../components/PasswordInput'
import Spinner from '../../components/Spinner'

export default function Login() {
  const { signIn, sendMagicLink, session, loading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const from = location.state?.from || '/dashboard'

  if (!loading && session) return <Navigate to={from} replace />

  async function handlePasswordSubmit(e) {
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

  async function handleMagicSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await sendMagicLink(email.trim())
      setMagicSent(true)
    } catch (err) {
      setError(err?.message || 'Could not send sign-in link. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (magicSent) {
    return (
      <AuthCard>
        <h1 className="font-heading text-h2 text-afri-purple">Check your email</h1>
        <p className="afri-muted mt-3 text-sm">
          We sent a one-time sign-in link to <strong>{email}</strong>. Click the link in the email to
          access the platform — it expires shortly.
        </p>
        <button type="button" onClick={() => setMagicSent(false)} className="afri-btn-secondary mt-6 w-full">
          Use a different email
        </button>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-heading text-h2 text-afri-purple">Sign in</h1>

      <div className="mt-4 flex rounded-lg border border-afri-lavender bg-afri-lavender/40 p-1">
        <button
          type="button"
          onClick={() => { setMode('password'); setError('') }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === 'password' ? 'bg-afri-white text-afri-purple shadow-sm dark:bg-afri-purple-elevated dark:text-afri-lavender' : 'afri-muted'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => { setMode('magic'); setError('') }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === 'magic' ? 'bg-afri-white text-afri-purple shadow-sm dark:bg-afri-purple-elevated dark:text-afri-lavender' : 'afri-muted'
          }`}
        >
          Magic link
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-afri-red/30 bg-afri-red/5 px-4 py-3 text-sm text-afri-red">
          {error}
        </div>
      )}

      {mode === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="mt-4 flex flex-col gap-4">
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

          <PasswordInput
            id="password"
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-afri-purple hover:underline">
              Forgot password?
            </Link>
          </div>

          <button type="submit" disabled={submitting} className="afri-btn-primary w-full">
            {submitting ? <Spinner /> : 'Sign in'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicSubmit} className="mt-4 flex flex-col gap-4">
          <p className="afri-muted text-sm">
            We&apos;ll email you a secure one-time link — no password needed.
          </p>
          <div>
            <label htmlFor="magic-email" className="afri-label">Email</label>
            <input
              id="magic-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="afri-input"
              placeholder="you@afrivate.com"
            />
          </div>
          <button type="submit" disabled={submitting} className="afri-btn-primary w-full">
            {submitting ? <Spinner /> : 'Send magic link'}
          </button>
        </form>
      )}

      <p className="afri-muted mt-4 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold text-afri-purple hover:underline">
          Request access
        </Link>
      </p>
    </AuthCard>
  )
}
