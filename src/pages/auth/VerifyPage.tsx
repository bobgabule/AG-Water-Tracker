import { useState, useEffect, useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../lib/AuthProvider';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useTranslation } from '../../hooks/useTranslation';
import AuthLayout from '../../components/auth/AuthLayout';
import OtpInput from '../../components/auth/OtpInput';
import { formatPhoneForDisplay } from '../../lib/formatPhone';
import { prefetchDashboard } from '../../lib/routePrefetch';

/** Cooldown duration in seconds */
const RESEND_COOLDOWN = 30;

/**
 * OTP verification page.
 * Allows users to enter the 6-digit code sent to their phone.
 * Features auto-advance, auto-submit, and resend with cooldown.
 */
export default function VerifyPage() {
  const { verifyOtp, sendOtp, refreshAuthStatus, user, isAuthReady, authStatus } = useAuth();
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Get phone from navigation state
  const phone = (location.state as { phone?: string } | null)?.phone;

  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Track if verification is in progress to prevent double-submit
  const verifyingRef = useRef(false);

  // Redirect if already logged in (only when status is loaded to avoid flash)
  useEffect(() => {
    if (isAuthReady && user && authStatus) {
      navigate(authStatus.hasFarmMembership ? '/' : '/no-subscription', { replace: true, viewTransition: true });
    }
  }, [isAuthReady, user, authStatus, navigate]);

  // Redirect if no phone in state (and not logged in)
  useEffect(() => {
    if (isAuthReady && !user && !phone) {
      navigate('/auth/phone', { replace: true, viewTransition: true });
    }
  }, [phone, isAuthReady, user, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle digit change
  const handleDigitChange = useCallback((index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    setCode((prevCode) => {
      const newCode = [...prevCode];
      newCode[index] = value;
      return newCode;
    });
    setError('');
  }, []);

  // Handle keyboard navigation (backspace)
  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) {
        // Move focus to previous input on backspace when current is empty
        const prevInput = document.querySelector<HTMLInputElement>(
          `input[aria-label="Digit ${index} of 6"]`
        );
        prevInput?.focus();
      }
    },
    [code]
  );

  // Verify the OTP code
  const handleVerify = useCallback(
    async (fullCode: string) => {
      if (!phone || verifyingRef.current) return;

      // Connectivity guard -- verification requires internet
      if (!isOnline) {
        setError(t('auth.noInternetVerify'));
        return;
      }

      try {
        verifyingRef.current = true;
        setLoading(true);
        setError('');
        await verifyOtp(phone, fullCode);
        const status = await refreshAuthStatus();
        prefetchDashboard();
        navigate(status?.hasFarmMembership ? '/' : '/no-subscription', { replace: true, viewTransition: true });
      } catch (err) {
        if (!navigator.onLine) {
          setError(t('auth.noInternetVerify'));
        } else {
          const message =
            err instanceof Error ? err.message : t('auth.invalidCode');
          setError(message);
        }
        // Clear code and focus first input on error
        setCode(['', '', '', '', '', '']);
      } finally {
        setLoading(false);
        verifyingRef.current = false;
      }
    },
    [phone, isOnline, verifyOtp, refreshAuthStatus, navigate, t]
  );

  // Auto-submit when all 4 digits are entered
  useEffect(() => {
    const isComplete = code.every((d) => d !== '') && code.join('').length === 6;
    if (isComplete && !loading && !verifyingRef.current) {
      handleVerify(code.join(''));
    }
  }, [code, loading, handleVerify]);

  // Handle resend code
  const handleResend = useCallback(async () => {
    if (!phone || resendCooldown > 0) return;

    // Connectivity guard -- resend requires internet
    if (!isOnline) {
      setError(t('auth.noInternetResend'));
      return;
    }

    try {
      setError('');
      await sendOtp(phone);
      setResendCooldown(RESEND_COOLDOWN);
      // Clear existing code
      setCode(['', '', '', '', '', '']);
    } catch (err) {
      if (!navigator.onLine) {
        setError(t('auth.noInternetResend'));
      } else {
        const message =
          err instanceof Error ? err.message : t('auth.failedResend');
        setError(message);
      }
    }
  }, [phone, isOnline, resendCooldown, sendOtp, t]);

  // Handle manual submit (for accessibility / button click)
  const handleSubmit = useCallback(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6 && !loading) {
      handleVerify(fullCode);
    }
  }, [code, loading, handleVerify]);

  // Navigate back to phone page
  const handleBack = useCallback(() => {
    navigate('/auth/phone', { replace: true, viewTransition: true });
  }, [navigate]);

  // Show branded loading while waiting for redirect (logged-in user or missing phone state)
  if (user || !phone) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  const isCodeComplete = code.every((d) => d !== '') && code.join('').length === 6;

  return (
    <AuthLayout>
      <h1 className="text-white text-2xl text-center font-semibold block mb-2 mt-5">
        {t('auth.verifyPhone')}
      </h1>
      <p className="text-gray-300 text-sm text-center mb-8">
        {t('auth.codeSentTo', { phone: formatPhoneForDisplay(phone) })}
      </p>

      {/* Error message */}
      {error && (
        <div className="bg-red-800/60 border border-red-800/40 text-red-800 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* OTP Input */}
      <div className="mb-6">
        <OtpInput
          value={code}
          onChange={handleDigitChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          error={!!error}
          autoFocus
        />
      </div>

      {/* Verify button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !isCodeComplete}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            {t('auth.verifying')}
          </span>
        ) : (
          t('auth.verify')
        )}
      </button>

      {/* Resend and back links */}
      <div className="text-center space-y-3">
        <p className="text-gray-400 text-sm">
          {t('auth.didntReceive')}{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-green-400 hover:text-green-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0 ? t('auth.resendIn', { count: resendCooldown }) : t('auth.resendCode')}
          </button>
        </p>

        <button
          type="button"
          onClick={handleBack}
          className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
        >
          {t('auth.changePhone')}
        </button>
      </div>
    </AuthLayout>
  );
}
