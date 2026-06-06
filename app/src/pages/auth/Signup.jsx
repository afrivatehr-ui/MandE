import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AuthCard from '../../components/auth/AuthCard'
import PasswordInput from '../../components/PasswordInput'
import Spinner from '../../components/Spinner'
import { supabase } from '../../lib/supabase'

export default function Signup() {
    const { session, loading } = useAuthStore()
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        organisation: '',
        role: 'HR',
    })
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    if (!loading && session) return <Navigate to="/dashboard" replace />

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setSubmitting(true)
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`,
                    data: { name: formData.name.trim() },
                },
            })

            if (authError) throw authError

            const { error: requestError } = await supabase.from('access_requests').insert({
                user_id: authData.user.id,
                email: formData.email.trim(),
                name: formData.name,
                organisation: formData.organisation,
                role_requested: formData.role,
                status: 'PENDING',
            })
            if (requestError) throw requestError

            setSuccess(true)
        } catch (err) {
            setError(err?.message || 'Failed to create account. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (success) {
        return (
            <AuthCard subtitle="">
                <h1 className="font-heading text-h2 text-afri-purple">Request submitted</h1>
                <p className="mt-3 afri-muted">
                    Your account has been created. Check your email to confirm your address, then an
                    admin will review your access request.
                </p>
                <Link to="/login" className="afri-btn-primary mt-6 inline-flex w-full justify-center">
                    Back to sign in
                </Link>
            </AuthCard>
        )
    }

    return (
        <AuthCard>
            <h1 className="font-heading text-h2 text-afri-purple">Request access</h1>

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
                        <option value="HR">HR (Read & Write)</option>
                        <option value="ADMIN">Admin (Full Access)</option>
                    </select>
                </div>

                <PasswordInput
                    id="password"
                    label="Password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                />

                <PasswordInput
                    id="confirmPassword"
                    label="Confirm password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                />

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
