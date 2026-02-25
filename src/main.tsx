import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthProvider'
import { preWarmPowerSync } from './lib/powersync'

// Start WASM + SQLite init in parallel with auth (saves ~200-500ms)
preWarmPowerSync()

// Eager preload for the most common landing route (parallel with auth)
import('./pages/DashboardPage').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
