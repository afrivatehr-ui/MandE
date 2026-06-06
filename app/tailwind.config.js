/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        afri: {
          purple: '#8D4087',
          lavender: '#F0E7F6',
          black: '#000000',
          white: '#FFFFFF',
          // Dark theme surfaces (purple-based)
          'purple-deep': '#1a0f1a',
          'purple-surface': '#2a1830',
          'purple-elevated': '#3d2545',
          'purple-light': '#5c3a5a',
          // Extended palette - promotional / status only, never UI chrome
          green: '#317D34',
          blue: '#1D45CF',
          yellow: '#EFDA0E',
          orange: '#ED620A',
          red: '#EB1111',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      fontSize: {
        // Brand type scale (Section 3.3)
        caption: ['12px', { lineHeight: '1.4' }],
        body: ['16px', { lineHeight: '1.6' }],
        h3: ['20px', { lineHeight: '1.3', fontWeight: '500' }],
        h2: ['26px', { lineHeight: '1.25', fontWeight: '600' }],
        h1: ['38px', { lineHeight: '1.15', fontWeight: '700' }],
      },
      spacing: {
        page: '48px', // Minimum padding on page edges (Section 3.4)
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(141, 64, 135, 0.08), 0 4px 16px rgba(141, 64, 135, 0.06)',
      },
    },
  },
  plugins: [],
}
