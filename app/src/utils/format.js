export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateRange(start, end) {
  return `${formatDate(start)} → ${formatDate(end)}`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatVpi(value) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)}%`
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const STATUS_LABEL = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  AWAITING_SURVEYS: 'Awaiting surveys',
  SURVEYS_COMPLETE: 'Surveys complete',
}
