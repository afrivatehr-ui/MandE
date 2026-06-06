/**
 * Survey completion indicators: V = volunteer, O = organisation.
 * When a party is not part of the deployment, show a muted dash.
 */
function Dot({ done, label, na }) {
  if (na) {
    return (
      <span
        title={`${label}: not applicable`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-afri-black/5 text-[10px] text-afri-black/25"
      >
        —
      </span>
    )
  }
  return (
    <span
      title={`${label}: ${done ? 'submitted' : 'pending'}`}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
        done ? 'bg-afri-green/15 text-afri-green' : 'bg-afri-black/5 text-afri-black/40'
      }`}
    >
      {label}
    </span>
  )
}

export default function SurveyStatus({ volDone, orgDone, volNa, orgNa, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Dot done={volDone} label="V" na={volNa} />
      <Dot done={orgDone} label="O" na={orgNa} />
    </span>
  )
}
