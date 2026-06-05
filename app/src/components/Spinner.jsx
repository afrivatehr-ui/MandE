export default function Spinner({ className = '', label }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-afri-purple/30 border-t-afri-purple" />
      {label && <span className="font-body text-sm text-afri-black/60">{label}</span>}
    </div>
  )
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-afri-lavender">
      <Spinner label={label} />
    </div>
  )
}
