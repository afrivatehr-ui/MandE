/**
 * Styled range slider for 1-10 / 0-10 scales (spec Section 10). Shows the
 * current value prominently and labels both endpoints.
 */
export default function SliderInput({
  value,
  onChange,
  min = 1,
  max = 10,
  minLabel,
  maxLabel,
  name,
}) {
  const percentage = value != null ? ((value - min) / (max - min)) * 100 : 0
  const isLow = value != null && value <= max * 0.33
  const isMedium = value != null && value > max * 0.33 && value < max * 0.67
  const isHigh = value != null && value >= max * 0.67

  const getGradientColor = () => {
    if (isLow) return 'from-afri-orange to-afri-yellow'
    if (isMedium) return 'from-afri-blue to-afri-purple'
    if (isHigh) return 'from-afri-green to-afri-blue'
    return 'from-afri-lavender to-afri-lavender'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        {value != null ? (
          <div className={`bg-gradient-to-r ${getGradientColor()} rounded-lg px-6 py-3 shadow-lg`}>
            <span className="font-heading text-4xl font-bold text-afri-white tabular-nums">
              {value}
              <span className="text-lg font-medium text-afri-white/80"> / {max}</span>
            </span>
          </div>
        ) : (
          <div className="rounded-lg bg-afri-lavender px-6 py-3">
            <span className="font-heading text-3xl font-bold text-afri-black/30">
              —<span className="text-base text-afri-black/20"> / {max}</span>
            </span>
          </div>
        )}
      </div>

      <div className="relative pt-2">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={name}
          className="afri-range w-full appearance-none bg-gradient-to-r from-afri-orange/30 to-afri-green/30 rounded-full h-3 outline-none transition-all"
          style={{
            background: `linear-gradient(to right, #FFA500 0%, #FFD700 ${percentage * 0.5}%, #00B4A6 ${percentage}%, #E8E8E8 ${percentage}%, #E8E8E8 100%)`
          }}
        />
      </div>

      <div className="flex justify-between font-body text-xs font-medium text-afri-black/60">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
