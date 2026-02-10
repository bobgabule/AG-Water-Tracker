import { useState, useEffect, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/AuthProvider';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { resolveNextRoute } from '../../lib/resolveNextRoute';
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
  const { session, onboardingStatus, sendOtp, isAuthReady } = useAuth();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to the appropriate route
  useEffect(() => {
    if (isAuthReady && session) {
      const nextRoute = resolveNextRoute(onboardingStatus);
      navigate(nextRoute, { replace: true });
    }
  }, [isAuthReady, session, onboardingStatus, navigate]);

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
        setError('Please enter a valid 10-digit phone number');
        return;
      }

      // Connectivity guard -- OTP requires internet
      if (!isOnline) {
        setError('No internet connection. Connect to the internet to sign in.');
        return;
      }

      try {
        setLoading(true);
        setError('');
        await sendOtp(`+1${cleanPhone}`);
        // Navigate to verify page with phone in state
        navigate('/auth/verify', { state: { phone: `+1${cleanPhone}` } });
      } catch (err) {
        if (!navigator.onLine) {
          setError('No internet connection. Connect to the internet to sign in.');
        } else {
          const message =
            err instanceof Error ? err.message : 'Failed to send verification code';
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [phone, isOnline, sendOtp, navigate]
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
        Sign In
      </h1>

      <form onSubmit={handleSubmit}>
        {/* Error message */}
        {error && (
          <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Phone input label */}
        <label htmlFor="phone" className="block text-white text-sm mb-2">
          Phone Number
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
            disabled={loading}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Sending...
            </span>
          ) : (
            'Send Code'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
