import { useEffect, useRef } from 'react'

/**
 * iOS PWA workaround: force service worker update checks on visibility change
 * and periodic polling. iOS freezes backgrounded PWAs instead of terminating
 * the old SW, so the browser's 24-hour update check rarely fires.
 */
export function useServiceWorkerUpdate() {
  const wasHidden = useRef(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {
          // Network error during update check — ignore silently
        })
      })
    }

    // Only trigger update check when returning from background, not on initial load
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden.current = true
      } else if (document.visibilityState === 'visible' && wasHidden.current) {
        checkForUpdate()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Poll every 30 minutes as fallback
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000)

    // Request persistent storage to reduce cache eviction.
    // Note: iOS always returns false — it does not honour the Persistent Storage API.
    navigator.storage?.persist?.().catch(() => {})

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
    }
  }, [])
}
