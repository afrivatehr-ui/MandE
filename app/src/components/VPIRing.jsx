import { categoryHex } from '../utils/category'

/**
 * Circular VPI progress ring. score is 0-100; ring colour follows the category.
 */
export default function VPIRing({ score, category, size = 140, stroke = 12 }) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = category ? categoryHex[category] : '#8D4087'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0E7F6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading text-2xl font-bold text-afri-purple">
          {score == null ? '--' : `${Math.round(score)}%`}
        </span>
        {category && <span className="font-body text-xs text-afri-black/60">Category {category}</span>}
      </div>
    </div>
  )
}
