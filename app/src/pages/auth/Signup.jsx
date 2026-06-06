import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Logo from '../../components/Logo'
import Spinner from '../../components/Spinner'
import { supabase } from '../../lib/supabase'

export default function Signup() {
    const { session, loading } = useAuthStore()
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        organisation: '',
        role: 'HR', // Default role requested
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

        // Validation
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
            // 1. Create Supabase auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
            })

            if (authError) throw authError

            // Access request for admin review (profile is auto-created by handle_new_user trigger).
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
            <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
                <div className="w-full max-w-md overflow-hidden rounded-card bg-afri-white shadow-card">
                    <div className="flex flex-col items-center gap-3 bg-afri-purple px-8 py-10">
                        <Logo variant="white" className="w-[180px]" />
                    </div>
                    <div className="flex flex-col gap-4 p-8">
                        <h1 className="font-heading text-h2 text-afri-purple">Request Submitted</h1>
                        <p className="text-afri-gray-600">
                            Your account has been created. An admin will review your access request shortly. You'll receive an email confirmation once approved.
                        </p>
                        <button onClick={() => navigate('/login')} className="afri-btn-primary w-full">
                            Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
            <div className="w-full max-w-md overflow-hidden rounded-card bg-afri-white shadow-card">
                <div className="flex flex-col items-center gap-3 bg-afri-purple px-8 py-10">
                    <Logo variant="white" className="w-[180px]" />
                    <p className="font-body text-sm text-afri-white/80">Monitoring &amp; Evaluation Platform</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8">
                    <h1 className="font-heading text-h2 text-afri-purple">Request Access</h1>

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
                        <label htmlFor="name" className="afri-label">Full Name</label>
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
                        <label htmlFor="role" className="afri-label">Role Requested</label>
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

                    <div>
                        <label htmlFor="password" className="afri-label">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="afri-input"
                            placeholder="••••••••"
                        />
                        <p className="mt-1 text-xs text-afri-gray-500">At least 8 characters</p>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="afri-label">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="afri-input"
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" disabled={submitting} className="afri-btn-primary mt-2 w-full">
                        {submitting ? <Spinner /> : 'Request Access'}
                    </button>

                    <p className="text-center text-sm text-afri-gray-600">
                        Already have an account?{' '}
                        <a href="/login" className="font-semibold text-afri-purple hover:underline">
                            Sign in
                        </a>
                    </p>
                </form>
            </div>
        </div>
    )
}
