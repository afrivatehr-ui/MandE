/**
 * Survey completion indicators for volunteer (Vol) and organisation (Org).
 * When a party is not part of the deployment, show a muted dash.
 */
function Dot({ done, linkUsed, label, na }) {
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

  let title = `${label}: pending`
  if (done) title = `${label}: submitted`
  else if (linkUsed) title = `${label}: link opened — awaiting submission`

  let colorClass = 'bg-afri-black/5 text-afri-black/40'
  if (done) colorClass = 'bg-afri-green/15 text-afri-green'
  else if (linkUsed) colorClass = 'bg-afri-orange/15 text-afri-orange'

  return (
    <span
      title={title}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${colorClass}`}
    >
      {label}
    </span>
  )
}

export default function SurveyStatus({
  volDone,
  orgDone,
  volLinkUsed = false,
  orgLinkUsed = false,
  volNa,
  orgNa,
  className = '',
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title="Volunteer / Organisation survey status">
      <Dot done={volDone} linkUsed={volLinkUsed} label="Vol" na={volNa} />
      <Dot done={orgDone} linkUsed={orgLinkUsed} label="Org" na={orgNa} />
    </span>
  )
}
