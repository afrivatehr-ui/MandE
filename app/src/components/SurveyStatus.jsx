/**
 * Two icon indicators showing whether the volunteer and org surveys are in.
 */
function Dot({ done, label }) {
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

export default function SurveyStatus({ volDone, orgDone, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Dot done={volDone} label="V" />
      <Dot done={orgDone} label="O" />
    </span>
  )
}
