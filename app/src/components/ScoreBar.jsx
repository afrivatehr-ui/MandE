/**
 * Inline horizontal score bar. Defaults to a 1-5 dimension scale.
 * Uses brand purple for the fill (neutral chrome), not status colours.
 */
export default function ScoreBar({ value, max = 5, showValue = true, className = '' }) {
  const safe = Number(value) || 0
  const pct = Math.max(0, Math.min(100, (safe / max) * 100))
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-afri-lavender">
        <div className="h-full rounded-full bg-afri-purple" style={{ width: `${pct}%` }} />
      </div>
      {showValue && (
        <span className="w-9 shrink-0 text-right font-body text-xs tabular-nums text-afri-black/70">
          {safe.toFixed(1)}
        </span>
      )}
    </div>
  )
}
