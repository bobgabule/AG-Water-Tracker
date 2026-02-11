import { Outlet, useLocation } from 'react-router';
import { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQuery } from '@powersync/react';
import Header from './Header';
import SideMenu from './SideMenu';
import { ErrorFallback } from './ErrorFallback';
import { PowerSyncProvider } from '../lib/PowerSyncContext';
import { useAuth } from '../lib/AuthProvider';
import { useRoleChangeDetector } from '../hooks/useRoleChangeDetector';

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
  const { user, onboardingStatus, signOut } = useAuth();
  const location = useLocation();

  // Detect server-side role changes and force data refresh
  useRoleChangeDetector();

  // Check if current user is disabled in any of their farm memberships
  const { data: disabledCheck } = useQuery<{ is_disabled: number }>(
    user?.id
      ? 'SELECT is_disabled FROM farm_members WHERE user_id = ? AND is_disabled = 1 LIMIT 1'
      : 'SELECT NULL WHERE 0',
    user?.id ? [user.id] : []
  );

  useEffect(() => {
    if (disabledCheck && disabledCheck.length > 0) {
      // User is disabled -- sign them out with a message
      alert('Your account has been disabled. Please contact your farm administrator.');
      signOut();
    }
  }, [disabledCheck, signOut]);

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
