import { Outlet, useLocation } from 'react-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQuery } from '@powersync/react';
import Header from './Header';
import SideMenu from './SideMenu';
import { ErrorFallback } from './ErrorFallback';
import { PowerSyncProvider, usePowerSyncStatus } from '../lib/PowerSyncContext';
import { useAuth } from '../lib/AuthProvider';
import { useRoleChangeDetector } from '../hooks/useRoleChangeDetector';
import Toast from './Toast';
import { SkeletonBlock, SkeletonLine } from './skeletons/SkeletonPrimitives';

/**
 * Lightweight skeleton shown in the content area while PowerSync initializes.
 * The app shell (Header + SideMenu) is already rendered and interactive.
 */
function ContentSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <SkeletonLine width="w-1/3" height="h-6" />
      <SkeletonBlock height="h-48" />
      <div className="space-y-2">
        <SkeletonLine width="w-full" />
        <SkeletonLine width="w-2/3" />
        <SkeletonLine width="w-1/2" />
      </div>
    </div>
  );
}

/**
 * Content rendered inside PowerSyncProvider once the database is ready.
 * Contains membership detection and role change monitoring that depend
 * on PowerSync queries.
 */
function PowerSyncContent() {
  const { user, authStatus, signOut } = useAuth();
  const location = useLocation();

  // Detect server-side role changes and force data refresh
  useRoleChangeDetector();

  // Detect when current user's farm membership is deleted (user removed).
  // User passed RequireOnboarded to reach here, so hasFarmMembership is true.
  // Debounced to avoid false positives from transient PowerSync sync states.
  const hadMembershipRef = useRef(false);
  const removalTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: membershipRows } = useQuery<{ cnt: number }>(
    user?.id && authStatus?.hasFarmMembership
      ? 'SELECT COUNT(*) as cnt FROM farm_members WHERE user_id = ?'
      : 'SELECT NULL WHERE 0',
    user?.id && authStatus?.hasFarmMembership ? [user.id] : []
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

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[location.pathname]}
    >
      <Outlet />
    </ErrorBoundary>
  );
}

/**
 * Gate that renders content skeleton while PowerSync initializes,
 * then renders the PowerSync-dependent content once the database is ready.
 * Must be a child of PowerSyncProvider.
 */
function PowerSyncGate() {
  const { loading } = usePowerSyncStatus();

  if (loading) {
    return <ContentSkeleton />;
  }

  return <PowerSyncContent />;
}

/**
 * Inner component that renders the app shell immediately.
 * Header and SideMenu render without PowerSync dependency.
 * The main content area is gated on PowerSync readiness.
 *
 * ErrorBoundary wraps only <Outlet /> so that page crashes preserve
 * Header and SideMenu navigation — users can navigate away without a
 * full page reload. resetKeys tied to pathname ensures the boundary
 * resets automatically when the user navigates to a different route.
 */
function AppLayoutContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { authStatus } = useAuth();

  // Farm name comes directly from auth state - no need for PowerSync query
  const farmName = authStatus?.farmName ?? null;

  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <Header farmName={farmName} onMenuOpen={handleMenuOpen} />
      <SideMenu open={menuOpen} onClose={handleMenuClose} />
      <main className="flex-1">
        <PowerSyncGate />
      </main>
      <Toast />
    </div>
  );
}

/**
 * Layout wrapper for the main app (protected routes).
 * Provides:
 * - PowerSyncProvider for offline-first data
 * - Header with farm name (renders immediately, no PowerSync dependency)
 * - SideMenu for navigation (renders immediately)
 * - Skeleton content while PowerSync initializes
 * - ErrorBoundary scoped to page content (Outlet only)
 */
export default function AppLayout() {
  return (
    <PowerSyncProvider>
      <AppLayoutContent />
    </PowerSyncProvider>
  );
}
