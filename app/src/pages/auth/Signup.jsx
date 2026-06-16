import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/auth/AuthCard'
import Spinner from '../../components/Spinner'
import { submitAccessRequest } from '../../api/access'

export default function Signup() {
  const { session, bootstrapped } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    organisation: '',
    role: 'VIEWER',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successWarning, setSuccessWarning] = useState('')

  if (bootstrapped && session) return <Navigate to="/dashboard" replace />

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await submitAccessRequest({
        email: formData.email.trim(),
        name: formData.name.trim(),
        organisation: formData.organisation.trim() || null,
        role_requested: formData.role,
      })
      setSuccessWarning(result?.warning ?? '')
      setSuccess(true)
    } catch (err) {
      setError(err?.message || 'Failed to submit access request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <AuthCard subtitle="">
        <h1 className="font-heading text-h2 text-afri-purple">Request submitted</h1>
        <p className="mt-3 afri-muted">
          Your request has been sent to our administrators for review. They have been notified by email
          and you will receive login instructions once your access is approved.
        </p>
        {successWarning && (
          <p className="mt-3 rounded-lg border border-afri-orange/30 bg-afri-orange/5 px-4 py-3 text-sm text-afri-black/75">
            {successWarning}
          </p>
        )}
        <Link to="/login" className="afri-btn-primary mt-6 inline-flex w-full justify-center">
          Back to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-heading text-h2 text-afri-purple">Request access</h1>
      <p className="afri-muted mt-2 text-sm">
        Submit your details below. Your request goes to the admin queue and all administrators are notified by email.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
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
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="afri-input"
            placeholder="you@organisation.com"
          />
        </div>

        <div>
          <label htmlFor="name" className="afri-label">Full name</label>
          <input
            id="name"
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="afri-input"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="organisation" className="afri-label">Organisation</label>
          <input
            id="organisation"
            type="text"
            name="organisation"
            value={formData.organisation}
            onChange={handleChange}
            className="afri-input"
            placeholder="Your organisation"
          />
        </div>

        <div>
          <label htmlFor="role" className="afri-label">Role requested</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="afri-input"
          >
            <option value="VIEWER">Viewer (Read-only)</option>
            <option value="HR">HR (Read & write)</option>
          </select>
        </div>

        <button type="submit" disabled={submitting} className="afri-btn-primary mt-2 w-full">
          {submitting ? <Spinner /> : 'Request access'}
        </button>

        <p className="text-center text-sm afri-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-afri-purple hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
