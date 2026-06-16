/**
 * Summary metric card. `tone` lets a card flag a critical value (e.g. C-players
 * > 0) using a status colour, otherwise stays in brand purple/lavender.
 */
const toneStyles = {
  default: 'border-afri-lavender',
  purple: 'border-afri-purple/20 bg-afri-purple text-afri-white',
  alert: 'border-afri-red/40',
}

export default function KPICard({ label, value, sub, tone = 'default', icon, onClick }) {
  const onPurple = tone === 'purple'
  return (
    <div
      onClick={onClick}
      className={`afri-card flex flex-col gap-1 p-5 ${toneStyles[tone] ?? toneStyles.default} ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className={`font-body text-xs uppercase tracking-wide ${onPurple ? 'text-afri-white/70' : 'afri-subtle'}`}>
          {label}
        </p>
        {icon && <span className={onPurple ? 'text-afri-white/70' : 'text-afri-purple/60'}>{icon}</span>}
      </div>
      <p
        className={`font-heading text-3xl font-bold ${onPurple ? 'text-afri-white' : tone === 'alert' ? 'text-afri-red' : 'text-afri-purple'
          }`}
      >
        {value}
      </p>
      {sub && (
        <p className={`font-body text-xs ${onPurple ? 'text-afri-white/70' : 'afri-subtle'}`}>{sub}</p>
      )}
    </div>
  )
}
