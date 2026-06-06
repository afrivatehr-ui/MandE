const LOGOS = {
  purple: '/logos/afrivate-full-logo-purple.png',
  white: '/logos/afrivate-logo.png',
  icon: '/logos/afrivate-logo-purple-favicon.png',
}

/**
 * Brand logo from /public/logos.
 *   variant="white"  — light logo on purple backgrounds (login header)
 *   variant="purple" — full purple wordmark on light backgrounds
 *   iconOnly         — favicon-style mark
 */
export default function Logo({ variant = 'purple', iconOnly = false, className = '' }) {
  const src = iconOnly ? LOGOS.icon : LOGOS[variant] ?? LOGOS.purple
  return (
    <img
      src={src}
      alt="Afrivate"
      className={className}
      draggable={false}
      style={iconOnly ? { height: '2rem', width: 'auto' } : { maxHeight: '3rem', width: 'auto' }}
    />
  )
}
