import iconPurple from '../assets/logo/icon-purple.svg'

/**
 * Brand logo. Uses the Afrivate icon SVG (PNG wordmarks are optional assets).
 *   purple/dark background -> variant="white" (inverted icon)
 *   white/lavender background -> variant="purple"
 */
export default function Logo({ variant = 'purple', iconOnly = false, className = '' }) {
  const invert = variant === 'white'
  return (
    <img
      src={iconPurple}
      alt="Afrivate"
      className={`${invert ? 'brightness-0 invert' : ''} ${className}`.trim()}
      draggable={false}
      style={iconOnly ? undefined : { maxHeight: '2.5rem', width: 'auto' }}
    />
  )
}
