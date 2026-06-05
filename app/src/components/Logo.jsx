import logoPurple from '../assets/logo/logo-purple.png'
import logoWhite from '../assets/logo/logo-white.png'
import iconPurple from '../assets/logo/icon-purple.svg'
import iconWhite from '../assets/logo/icon-white.png'

/**
 * Brand-correct logo. Pick the variant by background (spec Section 3.5):
 *   purple/dark background -> variant="white"
 *   white/lavender background -> variant="purple"
 * Use iconOnly for compact spaces / favicons / badges.
 */
export default function Logo({ variant = 'purple', iconOnly = false, className = '' }) {
  const src = iconOnly
    ? variant === 'white'
      ? iconWhite
      : iconPurple
    : variant === 'white'
      ? logoWhite
      : logoPurple
  return <img src={src} alt="Afrivate" className={className} draggable={false} />
}
