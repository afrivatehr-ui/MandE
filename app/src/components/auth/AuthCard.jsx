import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'
import ThemeToggle from '../ThemeToggle'

/** Shared card shell for auth pages (login, signup, forgot password, etc.). */
export default function AuthCard({ children, subtitle = 'Monitoring & Evaluation Platform' }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-afri-lavender p-4 sm:p-6 dark:bg-afri-purple-deep">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle className="text-afri-purple hover:bg-afri-lavender dark:text-afri-lavender dark:hover:bg-afri-purple-light/20" />
      </div>
      <div className="w-full max-w-md overflow-hidden rounded-card bg-afri-white shadow-card dark:bg-afri-purple-elevated dark:shadow-none">
        <div className="flex flex-col items-center gap-3 bg-afri-purple px-6 py-8 sm:px-8 sm:py-10 dark:bg-afri-purple-surface">
          <Logo variant="white" className="max-h-12 w-auto max-w-[200px]" />
          {subtitle && (
            <p className="text-center font-body text-sm text-afri-white/80">{subtitle}</p>
          )}
        </div>
        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

export function AuthLink({ to, children }) {
  return (
    <Link to={to} className="font-semibold text-afri-purple hover:underline dark:text-afri-lavender">
      {children}
    </Link>
  )
}
