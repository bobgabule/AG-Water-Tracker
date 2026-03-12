import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registers the service worker with autoUpdate strategy.
 *
 * New SWs activate immediately (skipWaiting + clientsClaim). The client-side
 * workbox-window code reloads the page on the `activated` event when it
 * detects an update, and main.tsx has a `controllerchange` listener as
 * defense-in-depth for iOS Safari.
 */
export function useServiceWorkerUpdate() {
  useRegisterSW({
    onRegisteredSW() {
      navigator.storage?.persist()
    },
  })
}
