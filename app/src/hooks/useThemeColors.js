import { useThemeStore } from '../store/themeStore'

/** Chart and SVG colours that adapt to light / dark theme. */
export function useThemeColors() {
  const isDark = useThemeStore((s) => s.theme) === 'dark'
  return {
    isDark,
    tick: isDark ? '#F0E7F6' : '#000000',
    grid: isDark ? '#5c3a5a' : '#E3D4EC',
    tooltipCursor: isDark ? '#3d2545' : '#F0E7F6',
    radarStroke: '#8D4087',
    radarFill: '#8D4087',
  }
}
