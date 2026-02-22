import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeftIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useUserRole } from '../hooks/useUserRole';
import { useUserProfile } from '../hooks/useUserProfile';
import { ROLE_DISPLAY_NAMES, hasPermission } from '../lib/permissions';
import type { Role } from '../lib/permissions';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { farmId } = useActiveFarm();
  const userRole = useUserRole();
  const canManageFarm = hasPermission(userRole, 'manage_farm');
  const userProfile = useUserProfile();

  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Profile editing state
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clean up success timer on unmount
  useEffect(() => {
    return () => clearTimeout(successTimerRef.current);
  }, []);

  // Initialize form from profile (once)
  const hasInitRef = useRef(false);
  useEffect(() => {
    if (userProfile && !hasInitRef.current) {
      setFirstName(userProfile.first_name ?? '');
      setLastName(userProfile.last_name ?? '');
      setEmail(userProfile.email ?? '');
      hasInitRef.current = true;
    }
  }, [userProfile]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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

  const handleEditStart = useCallback(() => {
    // Reset to current profile values when entering edit mode
    setFirstName(userProfile?.first_name ?? '');
    setLastName(userProfile?.last_name ?? '');
    setEmail(userProfile?.email ?? '');
    setSaveError(null);
    setSaveSuccess(false);
    setEditing(true);
  }, [userProfile]);

  const handleEditCancel = useCallback(() => {
    setEditing(false);
    setSaveError(null);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return;

    if (!firstName.trim()) {
      setSaveError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setSaveError('Last name is required');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      setEditing(false);
      // Clear success message after 3 seconds
      clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [user?.id, firstName, lastName, email]);

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
        {/* Profile Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            {!editing && (
              <button
                onClick={handleEditStart}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>

          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm">Profile updated successfully</p>
            </div>
          )}

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
            {editing ? (
              /* Edit mode */
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleEditCancel}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <>
                <div className="p-4">
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-white">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </p>
                </div>
                {userProfile?.email && (
                  <div className="p-4">
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{userProfile.email}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Subscription Section -- growers/super_admin only */}
        {canManageFarm && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Subscription</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <button
                onClick={() => navigate('/subscription')}
                className="w-full flex items-center gap-3 p-4 text-gray-300 hover:bg-gray-700/50 transition-colors text-left rounded-lg"
              >
                <CreditCardIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">Manage Subscription</span>
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </section>
        )}

        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
            {user?.phone && (
              <div className="p-4">
                <p className="text-sm text-gray-400">Phone Number</p>
                <p className="text-white">{user.phone}</p>
              </div>
            )}

            {canManageFarm && farmId && (
              <div className="p-4">
                <p className="text-sm text-gray-400">Farm ID</p>
                <p className="text-white font-mono text-sm">{farmId}</p>
              </div>
            )}

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

        {/* Sign Out */}
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
    </div>
  );
}
