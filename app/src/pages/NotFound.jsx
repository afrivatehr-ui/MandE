import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-afri-lavender p-6 text-center">
      <Logo variant="purple" className="w-[180px]" />
      <h1 className="font-heading text-h1 text-afri-purple">Page not found</h1>
      <p className="max-w-md font-body text-afri-black/70">
        The page you are looking for does not exist or has moved.
      </p>
      <Link to="/dashboard" className="afri-btn-primary">Back to dashboard</Link>
    </div>
  )
}
