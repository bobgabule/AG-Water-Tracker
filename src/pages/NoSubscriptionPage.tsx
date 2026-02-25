import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { NoSymbolIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import AuthLayout from '../components/auth/AuthLayout';
import { formatPhoneForDisplay } from '../lib/formatPhone';

/**
 * Shown to authenticated users who have no farm membership.
 * Fetches subscription_website_url directly from Supabase (no PowerSync needed).
 * Re-checks farm membership on tab focus — if admin added the user, redirects to dashboard.
 */
export default function NoSubscriptionPage() {
  const { user, authStatus, signOut, refreshAuthStatus } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch subscription URL on mount
  useEffect(() => {
    async function fetchUrl() {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'subscription_website_url')
          .single();
        setSubscriptionUrl(data?.value ?? null);
      } catch {
        // Non-critical — link just won't show
      } finally {
        setLoading(false);
      }
    }
    fetchUrl();
  }, []);

  // Re-check farm membership when tab regains focus
  // Navigation is handled by the authStatus effect below — NOT here.
  // Navigating before React state propagates causes RequireOnboarded to see
  // stale authStatus and redirect back to /no-subscription.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await refreshAuthStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshAuthStatus]);

  // If farm membership detected (e.g. from auth state change), redirect
  useEffect(() => {
    if (authStatus?.hasFarmMembership) {
      navigate('/', { replace: true, viewTransition: true });
    }
  }, [authStatus?.hasFarmMembership, navigate]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/auth/phone', { replace: true, viewTransition: true });
  }, [signOut, navigate]);

  const phone = user?.phone ?? '';
  const showLink = !loading && subscriptionUrl && subscriptionUrl.trim() !== '';

  return (
    <AuthLayout>
      <div className="text-center">
        <NoSymbolIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />

        <h1 className="text-2xl font-semibold text-white mb-2">
          {t('auth.noFarmAccess')}
        </h1>

        <p className="text-gray-300 text-sm mb-2">
          {t('auth.noFarmDescription')}
        </p>

        {phone && (
          <p className="text-gray-400 text-sm mb-8">
            {t('auth.signedInAs', { phone: formatPhoneForDisplay(phone) })}
          </p>
        )}

        {showLink && (
          <a
            href={subscriptionUrl ?? ''}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium text-white transition-colors mb-4"
          >
            {t('auth.visitSubscription')}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="block w-full py-2 text-gray-400 hover:text-gray-300 text-sm font-medium transition-colors"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </AuthLayout>
  );
}
