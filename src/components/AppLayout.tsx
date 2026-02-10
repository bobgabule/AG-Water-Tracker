import { Outlet, useLocation } from 'react-router';
import { useState, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import Header from './Header';
import SideMenu from './SideMenu';
import { ErrorFallback } from './ErrorFallback';
import { PowerSyncProvider } from '../lib/PowerSyncContext';
import { useAuth } from '../lib/AuthProvider';

/**
 * Inner component rendered inside PowerSyncProvider.
 * Farm name comes from auth state (no PowerSync query needed).
 *
 * ErrorBoundary wraps only <Outlet /> so that page crashes preserve
 * Header and SideMenu navigation — users can navigate away without a
 * full page reload. resetKeys tied to pathname ensures the boundary
 * resets automatically when the user navigates to a different route.
 */
function AppLayoutContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { onboardingStatus } = useAuth();
  const location = useLocation();

  // Farm name comes directly from auth state - no need for PowerSync query
  const farmName = onboardingStatus?.farmName ?? null;

  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header farmName={farmName} onMenuOpen={handleMenuOpen} />
      <SideMenu open={menuOpen} onClose={handleMenuClose} />
      <main>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          resetKeys={[location.pathname]}
        >
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

/**
 * Layout wrapper for the main app (protected routes).
 * Provides:
 * - PowerSyncProvider for offline-first data
 * - Header with farm name
 * - SideMenu for navigation
 * - ErrorBoundary scoped to page content (Outlet only)
 */
export default function AppLayout() {
  return (
    <PowerSyncProvider>
      <AppLayoutContent />
    </PowerSyncProvider>
  );
}
