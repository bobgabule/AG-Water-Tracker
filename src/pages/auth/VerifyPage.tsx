import { useState, useEffect, useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../lib/AuthProvider';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { resolveNextRoute } from '../../lib/resolveNextRoute';
import AuthLayout from '../../components/auth/AuthLayout';
import OtpInput from '../../components/auth/OtpInput';

/**
 * Format phone number for display: +1 (XXX) XXX-XXXX
 */
function formatPhoneForDisplay(phone: string): string {
  // Assuming phone is in format +1XXXXXXXXXX
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7, 11);
    return `+1 (${area}) ${prefix}-${line}`;
  }
  return phone;
}

/** Cooldown duration in seconds */
const RESEND_COOLDOWN = 30;

/**
 * OTP verification page.
 * Allows users to enter the 4-digit code sent to their phone.
 * Features auto-advance, auto-submit, and resend with cooldown.
 */
export default function VerifyPage() {
  const { verifyOtp, sendOtp, refreshOnboardingStatus, user, isAuthReady, onboardingStatus } = useAuth();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const location = useLocation();

  // Get phone from navigation state
  const phone = (location.state as { phone?: string } | null)?.phone;

  const [code, setCode] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Track if verification is in progress to prevent double-submit
  const verifyingRef = useRef(false);

  // Redirect if already logged in (only when status is loaded to avoid flash)
  useEffect(() => {
    if (isAuthReady && user && onboardingStatus) {
      const nextRoute = resolveNextRoute(onboardingStatus);
      navigate(nextRoute, { replace: true });
    }
  }, [isAuthReady, user, onboardingStatus, navigate]);

  // Redirect if no phone in state (and not logged in)
  useEffect(() => {
    if (isAuthReady && !user && !phone) {
      navigate('/auth/phone', { replace: true });
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
          `input[aria-label="Digit ${index} of 4"]`
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
        setError('No internet connection. Connect to the internet to verify your code.');
        return;
      }

      try {
        verifyingRef.current = true;
        setLoading(true);
        setError('');
        await verifyOtp(phone, fullCode);
        const status = await refreshOnboardingStatus();
        const nextRoute = resolveNextRoute(status);
        navigate(nextRoute, { replace: true });
      } catch (err) {
        if (!navigator.onLine) {
          setError('No internet connection. Connect to the internet to verify your code.');
        } else {
          const message =
            err instanceof Error ? err.message : 'Invalid verification code';
          setError(message);
        }
        // Clear code and focus first input on error
        setCode(['', '', '', '']);
      } finally {
        setLoading(false);
        verifyingRef.current = false;
      }
    },
    [phone, isOnline, verifyOtp, refreshOnboardingStatus, navigate]
  );

  // Auto-submit when all 4 digits are entered
  useEffect(() => {
    const isComplete = code.every((d) => d !== '') && code.join('').length === 4;
    if (isComplete && !loading && !verifyingRef.current) {
      handleVerify(code.join(''));
    }
  }, [code, loading, handleVerify]);

  // Handle resend code
  const handleResend = useCallback(async () => {
    if (!phone || resendCooldown > 0) return;

    // Connectivity guard -- resend requires internet
    if (!isOnline) {
      setError('No internet connection. Connect to the internet to resend the code.');
      return;
    }

    try {
      setError('');
      await sendOtp(phone);
      setResendCooldown(RESEND_COOLDOWN);
      // Clear existing code
      setCode(['', '', '', '']);
    } catch (err) {
      if (!navigator.onLine) {
        setError('No internet connection. Connect to the internet to resend the code.');
      } else {
        const message =
          err instanceof Error ? err.message : 'Failed to resend code';
        setError(message);
      }
    }
  }, [phone, isOnline, resendCooldown, sendOtp]);

  // Handle manual submit (for accessibility / button click)
  const handleSubmit = useCallback(() => {
    const fullCode = code.join('');
    if (fullCode.length === 4 && !loading) {
      handleVerify(fullCode);
    }
  }, [code, loading, handleVerify]);

  // Navigate back to phone page
  const handleBack = useCallback(() => {
    navigate('/auth/phone', { replace: true });
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

  const isCodeComplete = code.every((d) => d !== '') && code.join('').length === 4;

  return (
    <AuthLayout>
      <h1 className="text-white text-2xl text-center font-semibold block mb-2 mt-5">
        Verify your phone
      </h1>
      <p className="text-gray-300 text-sm text-center mb-8">
        We sent a code to{' '}
        <span className="text-white font-medium">
          {formatPhoneForDisplay(phone)}
        </span>
      </p>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
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
            Verifying...
          </span>
        ) : (
          'Verify'
        )}
      </button>

      {/* Resend and back links */}
      <div className="text-center space-y-3">
        <p className="text-gray-400 text-sm">
          {"Didn't receive the code? "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-green-400 hover:text-green-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </p>

        <button
          type="button"
          onClick={handleBack}
          className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
        >
          Change phone number
        </button>
      </div>
    </AuthLayout>
  );
}
