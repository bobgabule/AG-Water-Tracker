import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/AuthContext';

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  function formatPhoneDisplay(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setSubmitting(true);
    try {
      await sendOtp(`+1${phone}`);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (otpCode.length < 4) {
      setError('Please enter the verification code');
      return;
    }

    setSubmitting(true);
    try {
      const { isNewUser } = await verifyOtp(`+1${phone}`, otpCode);
      if (isNewUser) {
        navigate('/register');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    setError(null);
    setSubmitting(true);
    try {
      await sendOtp(`+1${phone}`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-evenly px-4 relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(20, 40, 60, 0.3), rgba(10, 30, 20, 0.7)),
            url('/bg-farm.jpg')`,
          backgroundColor: '#1a3a2a',
        }}
      />

      {/* Fallback gradient if no image */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/80 via-emerald-900/70 to-green-950/90 -z-10" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-30">
          <h1 className="text-4xl font-bold">
            <span className="text-green-400">AG</span>{' '}
            <span className="text-white">Water</span>
          </h1>
          <h2 className="text-4xl font-bold text-white -mt-1">Tracker</h2>
        </div>

        {step === 'phone' ? (
          <>
            {/* Sign In heading */}
            <h3 className="text-white text-2xl text-center font-semibold mb-20">Sign In</h3>
            <p className="text-white text-sm mb-2">Phone Number</p>
            <form onSubmit={handleSendCode}>
              {error && (
                <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
                  {error}
                </div>
              )}

              <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden mb-15">
                <span className="text-white/60 text-sm pl-3 pr-1 select-none">+1</span>
                <input
                  type="tel"
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="flex-1 bg-transparent text-white px-2 py-3 focus:outline-none placeholder-white/40"
                  placeholder="000-000-0000"
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </span>
                ) : (
                  'Send Code'
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* OTP verification step */}
            <h3 className="text-white text-2xl text-center font-semibold mb-30">Sign In</h3>
            <p className="text-white text-sm mb-2">Verification Code</p>

            <form onSubmit={handleVerifyCode}>
              {error && (
                <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
                  {error}
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden mb-15">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-transparent text-white text-center text-2xl tracking-[0.5em] px-4 py-3 focus:outline-none placeholder-white/40"
                  placeholder="0000"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Verifying...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtpCode('');
                    setError(null);
                  }}
                  className="text-green-300 text-sm hover:underline"
                >
                  Change number
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={submitting}
                  className="text-green-300 text-sm hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
