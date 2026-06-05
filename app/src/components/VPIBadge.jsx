import { categoryBadgeClass, CATEGORY_LABEL } from '../utils/category'

export default function VPIBadge({ category, showLabel = true, className = '' }) {
  if (!category) {
    return (
      <span className={`inline-flex items-center rounded-full border border-afri-black/10 bg-afri-black/5 px-2.5 py-0.5 font-body text-xs text-afri-black/50 ${className}`}>
        Pending
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-heading text-xs font-medium ${categoryBadgeClass[category]} ${className}`}
    >
      <span className="font-semibold">{category}</span>
      {showLabel && <span className="font-body">· {CATEGORY_LABEL[category]}</span>}
    </span>
  )
}
