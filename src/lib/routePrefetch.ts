const routeMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/DashboardPage'),
  '/app/dashboard': () => import('../pages/DashboardPage'),
  '/wells': () => import('../pages/WellListPage'),
  '/reports': () => import('../pages/ReportsPage'),
  '/users': () => import('../pages/UsersPage'),
  '/subscription': () => import('../pages/SubscriptionPage'),
  '/language': () => import('../pages/LanguagePage'),
  '/settings': () => import('../pages/SettingsPage'),
};

/** Tracks which routes have already been prefetched this session */
const prefetched = new Set<string>();

/** Returns true if prefetching should be skipped (offline or data-saver) */
function shouldSkipPrefetch(): boolean {
  if (typeof navigator === 'undefined') return true;
  if (!navigator.onLine) return true;
  if ((navigator as any).connection?.saveData === true) return true;
  return false;
}

/**
 * Prefetch a route's chunk. Deduplicates — each route is only fetched once per session.
 * Skips when offline or data-saver is enabled.
 */
export function prefetchRoute(path: string): void {
  if (shouldSkipPrefetch()) return;
  if (prefetched.has(path)) return;
  prefetched.add(path);
  routeMap[path]?.().catch(() => {});
}

/** Module-level debounce timer handle */
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Debounced prefetch for desktop hover — 100ms delay.
 * Clears any pending prefetch before scheduling a new one.
 */
export function prefetchRouteDebounced(path: string): void {
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    prefetchRoute(path);
    debounceTimer = undefined;
  }, 100);
}

/**
 * Sequential prefetch for mobile menu open.
 * Prefetches Dashboard first, then Well List on completion.
 * Skips if both are already prefetched or if network conditions are poor.
 */
export function prefetchOnMenuOpen(): void {
  if (shouldSkipPrefetch()) return;
  if (prefetched.has('/') && prefetched.has('/wells')) return;

  // Mark both as prefetched upfront to prevent concurrent calls
  prefetched.add('/');
  prefetched.add('/wells');

  routeMap['/']?.()
    .then(() => routeMap['/wells']?.())
    .catch(() => {});
}

/**
 * Prefetch the dashboard chunk — semantic wrapper for login transition.
 */
export function prefetchDashboard(): void {
  prefetchRoute('/');
}
