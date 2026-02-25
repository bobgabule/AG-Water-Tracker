import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthProvider';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useTranslation } from '../../hooks/useTranslation';
import AuthLayout from '../../components/auth/AuthLayout';

/**
 * Format a 10-digit phone number for display: XXX-XXX-XXXX
 */
function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Phone input page for authentication.
 * Allows users to enter their phone number to receive an OTP.
 * If already logged in, redirects to the appropriate route.
 */
export default function PhonePage() {
  const { session, authStatus, sendOtp, isAuthReady } = useAuth();
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(!isOnline);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Track offline state with delayed hide for fade-out animation
  useEffect(() => {
    if (!isOnline) {
      // Show immediately when going offline
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      setShowBanner(true);
    } else if (showBanner) {
      // Delay hiding so CSS fade-out can complete
      fadeTimerRef.current = setTimeout(() => setShowBanner(false), 500);
    }
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps -- showBanner intentionally excluded to avoid re-triggering

  // If already logged in, redirect to dashboard or no-subscription
  useEffect(() => {
    if (isAuthReady && session && authStatus) {
      navigate(authStatus.hasFarmMembership ? '/' : '/no-subscription', { replace: true, viewTransition: true });
    }
  }, [isAuthReady, session, authStatus, navigate]);

  // Handle phone input change - extract only digits
  const handlePhoneChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    // Clear error when user starts typing
    if (error) setError('');
  }, [error]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate 10 digits
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setError(t('auth.invalidPhone'));
        return;
      }

      // Connectivity guard -- OTP requires internet
      if (!isOnline) {
        setError(t('auth.noInternet'));
        return;
      }

      try {
        setLoading(true);
        setError('');
        await sendOtp(`+1${cleanPhone}`);
        // Navigate to verify page with phone in state
        navigate('/auth/verify', { state: { phone: `+1${cleanPhone}` }, viewTransition: true });
      } catch (err) {
        if (!navigator.onLine) {
          setError(t('auth.noInternet'));
        } else {
          const message =
            err instanceof Error ? err.message : t('auth.failedSendCode');
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [phone, isOnline, sendOtp, navigate, t]
  );

  // Show loading spinner while auth is initializing
  if (!isAuthReady) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-white text-2xl text-center font-semibold block py-4 mb-4">
        {t('auth.signIn')}
      </h1>

      {showBanner && (
        <div
          className={`bg-amber-600/80 border border-amber-400/50 text-amber-50 text-sm rounded-lg p-3 mb-4 text-center transition-all duration-500 ${
            isOnline ? 'opacity-0 max-h-0 mb-0 p-0 border-0 overflow-hidden' : 'opacity-100 max-h-20'
          }`}
          role="alert"
        >
          {t('auth.offlineBanner')}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Error message */}
        {error && (
          <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Phone input label */}
        <label htmlFor="phone" className="block text-white text-sm mb-2">
          {t('auth.phoneNumber')}
        </label>

        {/* Phone input with +1 prefix */}
        <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden mb-6 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-400 transition-colors">
          <span className="text-white/60 text-sm pl-3 pr-1 select-none">+1</span>
          <input
            id="phone"
            type="tel"
            value={formatPhoneDisplay(phone)}
            onChange={handlePhoneChange}
            className="flex-1 bg-transparent text-white px-2 py-3 focus:outline-none placeholder-white/40"
            placeholder="000-000-0000"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            disabled={loading || !isOnline}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !isOnline}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              {t('auth.sending')}
            </span>
          ) : (
            t('auth.sendCode')
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
