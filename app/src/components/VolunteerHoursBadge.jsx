/** Total volunteer hours badge for profile / certificate views. */
export default function VolunteerHoursBadge({ hours, warning, className = '' }) {
  if (warning) {
    return (
      <div
        className={`inline-flex flex-col items-center rounded-xl border border-afri-orange/30 bg-afri-orange/10 px-4 py-3 text-center ${className}`}
        title={warning}
      >
        <span className="font-body text-xs text-afri-orange">Hours unavailable</span>
      </div>
    )
  }
  const value = Number(hours ?? 0)
  const label = value === 1 ? 'hour volunteered' : 'hours volunteered'
  return (
    <div
      className={`inline-flex flex-col items-center rounded-xl border border-afri-purple/20 bg-afri-lavender/60 px-4 py-3 text-center ${className}`}
      title="Total verified hours from deployments and past engagements"
    >
      <span className="font-heading text-2xl font-bold text-afri-purple">{value.toLocaleString()}</span>
      <span className="font-body text-xs text-afri-black/55">{label}</span>
    </div>
  )
}
