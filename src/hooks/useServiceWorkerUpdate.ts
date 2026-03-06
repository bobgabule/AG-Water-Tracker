import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Registers the service worker and checks for updates on visibility change
 * (debounced to avoid excessive checks on iOS where system overlays
 * trigger frequent visibilitychange events).
 *
 * Returns `needRefresh` and `updateServiceWorker` for the update toast UI.
 */
export function useServiceWorkerUpdate() {
  const lastCheckRef = useRef(0)
  const wasHidden = useRef(false)
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration

      // Request persistent storage (iOS always returns false)
      navigator.storage?.persist?.().catch(() => {})

      // Periodically check for new SW versions (handles long-open tabs/PWA)
      if (registration) {
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000) // every 1 hour
      }
    },
  })

  // Visibility-change listener with proper cleanup
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden.current = true
        return
      }
      if (!wasHidden.current || !registrationRef.current) return
      wasHidden.current = false

      const now = Date.now()
      if (now - lastCheckRef.current < UPDATE_CHECK_COOLDOWN_MS) return
      lastCheckRef.current = now
      registrationRef.current.update().catch(() => {})
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Auto-dismiss offlineReady after 3s (not actionable for the user)
  const [offlineReadyFlag, setOfflineReady] = offlineReady
  useEffect(() => {
    if (!offlineReadyFlag) return
    const t = setTimeout(() => setOfflineReady(false), 3000)
    return () => clearTimeout(t)
  }, [offlineReadyFlag, setOfflineReady])

  return { needRefresh, updateServiceWorker }
}
