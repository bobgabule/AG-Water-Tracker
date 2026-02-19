import { Outlet, useLocation } from 'react-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQuery } from '@powersync/react';
import Header from './Header';
import SideMenu from './SideMenu';
import { ErrorFallback } from './ErrorFallback';
import { PowerSyncProvider } from '../lib/PowerSyncContext';
import { useAuth } from '../lib/AuthProvider';
import { useRoleChangeDetector } from '../hooks/useRoleChangeDetector';
import Toast from './Toast';

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

  // Detect when current user's farm membership is deleted (user removed).
  // User passed RequireOnboarded to reach here, so hasFarmMembership is true.
  // Debounced to avoid false positives from transient PowerSync sync states.
  const hadMembershipRef = useRef(false);
  const removalTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: membershipRows } = useQuery<{ cnt: number }>(
    user?.id && onboardingStatus?.hasFarmMembership
      ? 'SELECT COUNT(*) as cnt FROM farm_members WHERE user_id = ?'
      : 'SELECT NULL WHERE 0',
    user?.id && onboardingStatus?.hasFarmMembership ? [user.id] : []
  );

  useEffect(() => {
    if (!membershipRows || membershipRows.length === 0) return;
    const count = membershipRows[0].cnt;

    if (count > 0) {
      hadMembershipRef.current = true;
      // Clear any pending removal timer — membership is confirmed
      if (removalTimerRef.current) {
        clearTimeout(removalTimerRef.current);
        removalTimerRef.current = undefined;
      }
    } else if (hadMembershipRef.current && !removalTimerRef.current) {
      // Debounce: wait 3s to confirm removal isn't a transient sync state
      removalTimerRef.current = setTimeout(async () => {
        hadMembershipRef.current = false;
        removalTimerRef.current = undefined;
        alert('Your account has been removed from the farm. Please contact your farm administrator.');
        await signOut();
      }, 3000);
    }

    return () => {
      if (removalTimerRef.current) clearTimeout(removalTimerRef.current);
    };
  }, [membershipRows, signOut]);

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
      <Toast />
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
