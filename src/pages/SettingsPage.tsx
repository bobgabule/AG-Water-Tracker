import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  PlusIcon,
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useUserRole } from '../hooks/useUserRole';
import { isAdminOrAbove, ROLE_DISPLAY_NAMES } from '../lib/permissions';
import type { Role } from '../lib/permissions';
import PendingInvitesList from '../components/PendingInvitesList';
import AddUserModal from '../components/AddUserModal';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, onboardingStatus, signOut } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Get current user's role from permission module
  const userRole = useUserRole();
  const canManageTeam = isAdminOrAbove(userRole);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleOpenInviteModal = useCallback(() => {
    setShowInviteModal(true);
  }, []);

  const handleCloseInviteModal = useCallback(() => {
    setShowInviteModal(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setSignOutLoading(true);
      setSignOutError(null);
      await signOut();
      navigate('/auth');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setSignOutError(message);
    } finally {
      setSignOutLoading(false);
    }
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-primary px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="h-6 w-6 text-white" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Team Management Section - only for admin-level roles */}
        {canManageTeam && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-white">Team Management</h2>
              </div>
              <button
                onClick={handleOpenInviteModal}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add User
              </button>
            </div>
            <PendingInvitesList />
          </section>
        )}

        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
            {/* User info */}
            {user?.phone && (
              <div className="p-4">
                <p className="text-sm text-gray-400">Phone Number</p>
                <p className="text-white">{user.phone}</p>
              </div>
            )}

            {/* Farm info */}
            {onboardingStatus?.farmId && (
              <div className="p-4">
                <p className="text-sm text-gray-400">Farm ID</p>
                <p className="text-white font-mono text-sm">{onboardingStatus.farmId}</p>
              </div>
            )}

            {/* Role info */}
            {userRole && (
              <div className="p-4">
                <p className="text-sm text-gray-400">Role</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    userRole === 'super_admin'
                      ? 'bg-purple-500/20 text-purple-400'
                      : userRole === 'grower'
                        ? 'bg-green-500/20 text-green-400'
                        : userRole === 'admin'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {ROLE_DISPLAY_NAMES[userRole as Role]}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Sign Out</h2>

          {signOutError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{signOutError}</p>
            </div>
          )}

          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
          >
            {signOutLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing Out...
              </>
            ) : (
              <>
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                Sign Out
              </>
            )}
          </button>
        </section>
      </main>

      {/* Add User Modal */}
      <AddUserModal
        open={showInviteModal}
        onClose={handleCloseInviteModal}
      />
    </div>
  );
}
