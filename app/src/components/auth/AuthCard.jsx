import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'

/** Shared card shell for auth pages (login, signup, forgot password, etc.). */
export default function AuthCard({ children, subtitle = 'Monitoring & Evaluation Platform' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
      <div className="w-full max-w-md overflow-hidden rounded-card bg-afri-white shadow-card">
        <div className="flex flex-col items-center gap-3 bg-afri-purple px-8 py-10">
          <Logo variant="white" className="max-h-12 w-auto max-w-[200px]" />
          {subtitle && (
            <p className="font-body text-sm text-afri-white/80">{subtitle}</p>
          )}
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}

export function AuthLink({ to, children }) {
  return (
    <Link to={to} className="font-semibold text-afri-purple hover:underline">
      {children}
    </Link>
  )
}
