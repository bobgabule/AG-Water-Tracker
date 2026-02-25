import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRightStartOnRectangleIcon,
  ChevronRightIcon,
  CreditCardIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useUserRole } from '../hooks/useUserRole';
import { useUserProfile } from '../hooks/useUserProfile';
import { hasPermission, getRoleDisplayName } from '../lib/permissions';
import type { Role } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export default function SettingsPage() {
  const { t, locale } = useTranslation();
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

  const handleSignOut = useCallback(async () => {
    try {
      setSignOutLoading(true);
      setSignOutError(null);
      await signOut();
      navigate('/auth', { viewTransition: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('settings.failedSignOut');
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
      setSaveError(t('settings.firstNameRequired'));
      return;
    }
    if (!lastName.trim()) {
      setSaveError(t('settings.lastNameRequired'));
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
      const message = err instanceof Error ? err.message : t('settings.failedUpdate');
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [user?.id, firstName, lastName, email]);

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      {/* Content */}
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-4">{t('settings.title')}</h1>
        {/* Profile Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-heading">{t('settings.profile')}</h2>
            {!editing && (
              <button
                onClick={handleEditStart}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-heading/60 hover:text-text-heading hover:bg-surface-card-hover rounded-lg transition-colors"
              >
                <PencilSquareIcon className="h-4 w-4" />
                {t('settings.edit')}
              </button>
            )}
          </div>

          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm">{t('settings.profileUpdated')}</p>
            </div>
          )}

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{saveError}</p>
            </div>
          )}

          <div className="bg-surface-card rounded-lg divide-y divide-text-heading/10">
            {editing ? (
              /* Edit mode */
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-text-heading/60 mb-1.5">{t('settings.firstName')}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-input border border-text-heading/15 rounded-lg text-text-heading text-sm placeholder-text-heading/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-heading/60 mb-1.5">{t('settings.lastName')}</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-input border border-text-heading/15 rounded-lg text-text-heading text-sm placeholder-text-heading/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-heading/60 mb-1.5">{t('settings.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('settings.emailPlaceholder')}
                    className="w-full px-3 py-2.5 bg-surface-input border border-text-heading/15 rounded-lg text-text-heading text-sm placeholder-text-heading/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleEditCancel}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg font-medium text-text-heading/70 bg-surface-input hover:bg-surface-card-hover transition-colors disabled:opacity-50"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t('settings.saving')}
                      </>
                    ) : (
                      t('settings.save')
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <>
                <div className="p-4">
                  <p className="text-sm text-text-heading/60">{t('settings.name')}</p>
                  <p className="text-text-heading">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </p>
                </div>
                {userProfile?.email && (
                  <div className="p-4">
                    <p className="text-sm text-text-heading/60">{t('settings.email')}</p>
                    <p className="text-text-heading">{userProfile.email}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Subscription Section -- owners/super_admin only */}
        {canManageFarm && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-text-heading mb-4">{t('settings.subscription')}</h2>
            <div className="bg-surface-card rounded-lg">
              <button
                onClick={() => navigate('/subscription', { viewTransition: true })}
                className="w-full flex items-center gap-3 p-4 text-text-heading hover:bg-surface-card-hover transition-colors text-left rounded-lg"
              >
                <CreditCardIcon className="h-5 w-5 text-text-heading/60 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">{t('settings.manageSubscription')}</span>
                <ChevronRightIcon className="h-4 w-4 text-text-heading/40" />
              </button>
            </div>
          </section>
        )}

        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-heading mb-4">{t('settings.account')}</h2>
          <div className="bg-surface-card rounded-lg divide-y divide-text-heading/10">
            {user?.phone && (
              <div className="p-4">
                <p className="text-sm text-text-heading/60">{t('settings.phoneNumber')}</p>
                <p className="text-text-heading">{user.phone}</p>
              </div>
            )}

            {canManageFarm && farmId && (
              <div className="p-4">
                <p className="text-sm text-text-heading/60">{t('settings.farmId')}</p>
                <p className="text-text-heading font-mono text-sm">{farmId}</p>
              </div>
            )}

            {userRole && (
              <div className="p-4">
                <p className="text-sm text-text-heading/60">{t('settings.role')}</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    userRole === 'super_admin'
                      ? 'bg-purple-500/20 text-purple-400'
                      : userRole === 'owner'
                        ? 'bg-green-500/20 text-green-400'
                        : userRole === 'admin'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {getRoleDisplayName(userRole as Role, locale)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Sign Out */}
        <section>
          <h2 className="text-lg font-semibold text-text-heading mb-4">{t('settings.signOut')}</h2>

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
                {t('auth.signingOut')}
              </>
            ) : (
              <>
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                {t('settings.signOut')}
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}
