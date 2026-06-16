import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Application error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
          <div className="w-full max-w-md rounded-card bg-afri-white p-8 shadow-card">
            <h1 className="font-heading text-h2 text-afri-purple">Something went wrong</h1>
            <p className="afri-muted mt-3 text-sm">
              The page hit an unexpected error. Try refreshing, or return to a safe page.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="afri-btn-primary w-full"
              >
                Refresh page
              </button>
              <Link to="/" className="afri-btn-secondary w-full text-center">
                Go to home
              </Link>
              <Link to="/login" className="afri-btn-secondary w-full text-center">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
