import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { applyTheme } from './store/themeStore'

// Apply persisted theme before first paint to avoid flash
try {
  const stored = localStorage.getItem('afrivate-me-theme')
  if (stored) {
    const parsed = JSON.parse(stored)
    if (parsed?.state?.theme) applyTheme(parsed.state.theme)
  }
} catch {
  applyTheme('light')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
