import { getActionFlag } from '../utils/vpiEngine'

const styles = {
  A: 'bg-afri-green/10 text-afri-green',
  B: 'bg-afri-yellow/20 text-[#7a6a00]',
  C: 'bg-afri-red/10 text-afri-red',
}

const Icon = ({ category }) => {
  const common = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (category === 'A') return <svg {...common}><polyline points="20 6 9 17 4 12" /></svg>
  if (category === 'B') return <svg {...common}><path d="M12 20v-6M12 8h.01" /><circle cx="12" cy="12" r="9" /></svg>
  return <svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}

export default function ActionFlag({ category, className = '' }) {
  if (!category) return null
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-body text-xs font-medium ${styles[category]} ${className}`}>
      <Icon category={category} />
      {getActionFlag(category)}
    </span>
  )
}
