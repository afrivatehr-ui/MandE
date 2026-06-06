import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/auth/AuthCard'
import Spinner from '../../components/Spinner'

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuthStore()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await resetPasswordForEmail(email.trim())
      setSent(true)
    } catch (err) {
      setError(err?.message || 'Could not send reset email. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthCard>
        <h1 className="font-heading text-h2 text-afri-purple">Check your email</h1>
        <p className="mt-3 text-sm text-afri-gray-600">
          If an account exists for <strong>{email}</strong>, we sent a password reset link.
          The link expires shortly — check your spam folder if you don&apos;t see it.
        </p>
        <Link to="/login" className="afri-btn-primary mt-6 inline-flex w-full justify-center">
          Back to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-heading text-h2 text-afri-purple">Forgot password</h1>
      <p className="mt-2 text-sm text-afri-gray-600">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
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

        <button type="submit" disabled={submitting} className="afri-btn-primary w-full">
          {submitting ? <Spinner /> : 'Send reset link'}
        </button>

        <p className="text-center text-sm text-afri-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-afri-purple hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
