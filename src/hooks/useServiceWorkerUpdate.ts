import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const PERIODIC_CHECK_MS = 4 * 60 * 60 * 1000 // 4 hours

/**
 * Registers the service worker and periodically checks for updates.
 *
 * Uses "lazy update" strategy: new SWs are downloaded in the background
 * but never activated mid-session (no skipWaiting, no reload). The new SW
 * activates naturally on next app launch when all old clients are gone.
 * This eliminates forced refreshes on both Chrome and iOS Safari.
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
    // New SW is waiting — do nothing. It will activate on next app launch.
    onNeedRefresh() {},
  })

  // Periodic background check + visibility-change listener
  // These only download the new SW; they never activate it or reload.
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
