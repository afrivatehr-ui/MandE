import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/auth/AuthCard'
import PasswordInput from '../../components/PasswordInput'
import Spinner from '../../components/Spinner'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuthStore()
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setTimedOut(true)
    }, 12000)

    async function checkRecovery() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (!cancelled) setReady(true)
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          setReady(true)
        }
      })

      return () => subscription.unsubscribe()
    }

    const cleanupPromise = checkRecovery()
    return () => {
      cancelled = true
      clearTimeout(timeout)
      cleanupPromise.then((unsub) => unsub?.())
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'Could not update password. Request a new reset link and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (timedOut && !ready) {
    return (
      <AuthCard subtitle="">
        <h1 className="font-heading text-h2 text-afri-purple">Link expired</h1>
        <p className="afri-muted mt-3 text-sm">
          This password reset link is invalid or has expired. Request a new one below.
        </p>
        <Link to="/forgot-password" className="afri-btn-primary mt-6 inline-flex w-full justify-center">
          Request new reset link
        </Link>
      </AuthCard>
    )
  }

  if (!ready) {
    return (
      <AuthCard subtitle="">
        <div className="flex flex-col items-center gap-4 py-6">
          <Spinner label="Verifying reset link" />
          <p className="text-center text-sm afri-muted">
            Link expired?{' '}
            <Link to="/forgot-password" className="font-semibold text-afri-purple hover:underline">
              Request a new one
            </Link>
          </p>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-heading text-h2 text-afri-purple">Choose a new password</h1>
      <p className="mt-2 text-sm afri-muted">Enter and confirm your new password below.</p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-afri-red/30 bg-afri-red/5 px-4 py-3 text-sm text-afri-red">
            {error}
          </div>
        )}

        <PasswordInput
          id="password"
          label="New password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
        />

        <button type="submit" disabled={submitting} className="afri-btn-primary w-full">
          {submitting ? <Spinner /> : 'Update password'}
        </button>
      </form>
    </AuthCard>
  )
}
