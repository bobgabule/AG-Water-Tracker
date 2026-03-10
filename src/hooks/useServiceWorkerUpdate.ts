import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_COOLDOWN_MS = 15 * 60 * 1000 // 15 minutes
const PERIODIC_CHECK_MS = 60 * 60 * 1000 // 1 hour

/**
 * Registers the service worker and periodically checks for updates.
 * Uses autoUpdate mode — new SW activates silently, no user prompt needed.
 *
 * Visibility-change checks are debounced with a 15-min cooldown to
 * avoid excessive checks on iOS where system overlays trigger frequent
 * visibilitychange events.
 */
export function useServiceWorkerUpdate() {
  const lastCheckRef = useRef(0)
  const wasHidden = useRef(false)
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)

  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration
      navigator.storage?.persist()
    },
  })

  // Periodic update check + visibility-change listener with cleanup
  useEffect(() => {
    const intervalId = setInterval(() => {
      registrationRef.current?.update().catch(() => {})
    }, PERIODIC_CHECK_MS)

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
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
