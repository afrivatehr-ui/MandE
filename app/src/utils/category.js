// Category presentation helpers. Status colours (green/yellow/red) are used
// sparingly and only to signal performance tier, per brand rules (Section 3.2).

export const CATEGORY_LABEL = {
  A: 'A-Player',
  B: 'B-Player',
  C: 'C-Player',
}

export const CATEGORY_DESCRIPTION = {
  A: 'High Performer',
  B: 'Developing Performer',
  C: 'Needs Intervention',
}

// Tailwind class sets per category (tinted surfaces keep text legible).
export const categoryBadgeClass = {
  A: 'bg-afri-green/10 text-afri-green border border-afri-green/30',
  B: 'bg-afri-yellow/20 text-[#7a6a00] border border-afri-yellow/50',
  C: 'bg-afri-red/10 text-afri-red border border-afri-red/30',
}

// Solid hex per category for charts / rings.
export const categoryHex = {
  A: '#317D34',
  B: '#EFDA0E',
  C: '#EB1111',
}

export function categoryFromVpi(vpi) {
  if (vpi == null) return null
  if (vpi >= 80) return 'A'
  if (vpi >= 60) return 'B'
  return 'C'
}
