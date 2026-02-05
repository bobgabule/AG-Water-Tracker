import { Outlet } from 'react-router';
import { useState, useCallback } from 'react';
import Header from './Header';
import SideMenu from './SideMenu';
import { PowerSyncProvider } from '../lib/PowerSyncContext';
import { useAuth } from '../lib/AuthProvider';

/**
 * Inner component rendered inside PowerSyncProvider.
 * Farm name comes from auth state (no PowerSync query needed).
 */
function AppLayoutContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { onboardingStatus } = useAuth();

  // Farm name comes directly from auth state - no need for PowerSync query
  const farmName = onboardingStatus?.farmName ?? null;

  const handleMenuOpen = useCallback(() => setMenuOpen(true), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header farmName={farmName} onMenuOpen={handleMenuOpen} />
      <SideMenu open={menuOpen} onClose={handleMenuClose} />
      <main>
        <Outlet />
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
 */
export default function AppLayout() {
  return (
    <PowerSyncProvider>
      <AppLayoutContent />
    </PowerSyncProvider>
  );
}
