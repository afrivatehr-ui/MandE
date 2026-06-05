import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // react-pdf is large but lazy-loaded only when generating a report.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split the heavy charting library out of the main bundle.
          recharts: ['recharts'],
        },
      },
    },
  },
})
