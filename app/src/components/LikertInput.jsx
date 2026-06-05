/**
 * 1-5 Likert as five labelled buttons (spec Section 10). Endpoints show their
 * label; middle values show the number only. Not radios, not a slider.
 */
const DEFAULT_LABELS = {
  1: 'Strongly Disagree',
  5: 'Strongly Agree',
}

export default function LikertInput({ value, onChange, labels = DEFAULT_LABELS, name }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={name}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n
          return (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(n)}
              className={`group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-1 py-2 text-center font-heading font-semibold transition-all duration-200 ${selected
                  ? 'border-afri-purple bg-gradient-to-br from-afri-purple to-afri-purple/90 text-afri-white shadow-lg shadow-afri-purple/30'
                  : 'border-afri-lavender bg-afri-white text-afri-black hover:border-afri-purple/40 hover:bg-afri-purple/5'
                }`}
            >
              <span className="text-xl leading-none group-hover:scale-110 transition-transform">{n}</span>
              {labels[n] && (
                <span className={`font-body text-[10px] leading-tight ${selected ? 'text-afri-white/90' : 'text-afri-black/55'}`}>
                  {labels[n]}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between px-1 font-body text-xs text-afri-black/40">
        <span>{labels[1] || 'Low'}</span>
        <span>{labels[5] || 'High'}</span>
      </div>
    </div>
  )
}
