import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '../lib/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthStep = 'phone' | 'otp' | 'profile' | 'farm';

interface UserProfile {
  id: string;
  farm_id: string | null;
  role: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

function computeStep(
  user: User | null,
  userProfile: UserProfile | null,
  otpSent: boolean,
): AuthStep | 'ready' {
  if (!user) return otpSent ? 'otp' : 'phone';
  if (!userProfile) return 'profile';
  if (!userProfile.farm_id) return 'farm';
  return 'ready';
}

// ---------------------------------------------------------------------------
// AuthPage (root)
// ---------------------------------------------------------------------------

export default function AuthPage() {
  const {
    user, userProfile, loading, sessionExpired,
    sendOtp, verifyOtp, createProfile, setFarmOnProfile, signOut,
  } = useAuth();
  const isOnline = useOnlineStatus();

  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Reset local state on sign-out
  useEffect(() => {
    if (!user) {
      setPhone('');
      setOtpSent(false);
    }
  }, [user]);

  const step = computeStep(user, userProfile, otpSent);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (step === 'ready') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(20, 40, 60, 0.3), rgba(10, 30, 20, 0.7)),
            url('/bg-farm.jpg')`,
          backgroundColor: '#1a3a2a',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/80 via-emerald-900/70 to-green-950/90 -z-10" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="text-green-400">AG</span>{' '}
            <span className="text-white">Water</span>
          </h1>
          <h2 className="text-4xl font-bold text-white -mt-1">Tracker</h2>
        </div>

        {/* Banners */}
        {!isOnline && (
          <div className="bg-amber-900/60 border border-amber-500/40 text-amber-200 text-sm rounded-lg p-3 mb-4">
            You are currently offline. An internet connection is required to sign in.
          </div>
        )}
        {sessionExpired && (
          <div className="bg-amber-900/60 border border-amber-500/40 text-amber-200 text-sm rounded-lg p-3 mb-4">
            Your session has expired. Please sign in again.
          </div>
        )}

        {/* Steps */}
        {step === 'phone' && (
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
            isOnline={isOnline}
            sendOtp={sendOtp}
            onOtpSent={() => setOtpSent(true)}
          />
        )}
        {step === 'otp' && (
          <OtpStep
            phone={phone}
            isOnline={isOnline}
            sendOtp={sendOtp}
            verifyOtp={verifyOtp}
            onBack={() => setOtpSent(false)}
          />
        )}
        {step === 'profile' && (
          <ProfileStep createProfile={createProfile} />
        )}
        {step === 'farm' && user && (
          <FarmStep
            userId={user.id}
            setFarmOnProfile={setFarmOnProfile}
            signOut={signOut}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhoneStep
// ---------------------------------------------------------------------------

function PhoneStep({
  phone, setPhone, isOnline, sendOtp, onOtpSent,
}: {
  phone: string;
  setPhone: (v: string) => void;
  isOnline: boolean;
  sendOtp: (phone: string) => Promise<void>;
  onOtpSent: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function formatDisplay(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }

  function handleChange(value: string) {
    setPhone(value.replace(/\D/g, '').slice(0, 10));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setSubmitting(true);
    try {
      await sendOtp(`+1${phone}`);
      onOtpSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h3 className="text-white text-2xl text-center font-semibold mt-22 mb-20">Sign In</h3>
      <p className="text-white text-sm mb-2">Phone Number</p>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}
        <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden mb-15">
          <span className="text-white/60 text-sm pl-3 pr-1 select-none">+1</span>
          <input
            type="tel"
            value={formatDisplay(phone)}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 bg-transparent text-white px-2 py-3 focus:outline-none placeholder-white/40"
            placeholder="000-000-0000"
            inputMode="numeric"
            autoComplete="tel-national"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !isOnline}
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
  );
}

// ---------------------------------------------------------------------------
// OtpStep
// ---------------------------------------------------------------------------

function OtpStep({
  phone, isOnline, sendOtp, verifyOtp, onBack,
}: {
  phone: string;
  isOnline: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<{ isNewUser: boolean }>;
  onBack: () => void;
}) {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (otpCode.length < 4) {
      setError('Please enter the verification code');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(`+1${phone}`, otpCode);
      // Step advances automatically via auth state change
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setSubmitting(true);
    try {
      await sendOtp(`+1${phone}`);
      setOtpCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h3 className="text-white text-2xl text-center font-semibold mt-22 mb-20">Sign In</h3>
      <p className="text-white text-sm mb-2">Verification Code</p>
      <form onSubmit={handleVerify}>
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
            maxLength={6}
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
            onClick={onBack}
            className="text-green-300 text-sm hover:underline"
          >
            Change number
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={submitting || !isOnline}
            className="text-green-300 text-sm hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// ProfileStep
// ---------------------------------------------------------------------------

function ProfileStep({
  createProfile,
}: {
  createProfile: (data: { firstName: string; lastName: string; email: string }) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      // Step advances automatically — userProfile is set in AuthContext
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h3 className="text-white text-2xl font-semibold mb-1">Register</h3>
      <p className="text-gray-300 text-sm mb-6">Enter your information below</p>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="firstName" className="block text-gray-300 text-sm mb-1">First name</label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40"
              placeholder="First"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-gray-300 text-sm mb-1">Last name</label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40"
              placeholder="Last"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40"
              placeholder="e@email.com"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Creating profile...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// FarmStep
// ---------------------------------------------------------------------------

function FarmStep({
  userId, setFarmOnProfile, signOut,
}: {
  userId: string;
  setFarmOnProfile: (farmId: string, role: string) => void;
  signOut: () => Promise<void>;
}) {
  return (
    <>
      <h3 className="text-white text-2xl font-semibold mb-1">Set up your farm</h3>
      <p className="text-gray-300 text-sm mb-6">Register a new farm or join an existing one</p>

      <TabGroup>
        <TabList className="flex gap-2 mb-6">
          <Tab className="flex-1 py-2.5 text-sm font-medium text-center rounded-lg cursor-pointer transition-colors focus:outline-none data-[selected]:bg-green-500/80 data-[selected]:text-white bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:bg-white/20">
            Register a Farm
          </Tab>
          <Tab className="flex-1 py-2.5 text-sm font-medium text-center rounded-lg cursor-pointer transition-colors focus:outline-none data-[selected]:bg-green-500/80 data-[selected]:text-white bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:bg-white/20">
            Join a Farm
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <CreateFarmForm userId={userId} onSuccess={setFarmOnProfile} />
          </TabPanel>
          <TabPanel>
            <JoinFarmForm userId={userId} onSuccess={setFarmOnProfile} />
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <button
        onClick={signOut}
        className="mt-6 w-full text-center text-sm text-green-300 hover:underline cursor-pointer"
      >
        Sign out
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// CreateFarmForm
// ---------------------------------------------------------------------------

function CreateFarmForm({
  userId, onSuccess,
}: {
  userId: string;
  onSuccess: (farmId: string, role: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const farmId = crypto.randomUUID();
      const { error: farmError } = await supabase
        .from('farms')
        .insert({ id: farmId, name, description: description || null });
      if (farmError) throw farmError;

      const { error: userError } = await supabase
        .from('users')
        .update({ farm_id: farmId, role: 'admin' })
        .eq('id', userId);
      if (userError) throw userError;

      onSuccess(farmId, 'admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register farm');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="farmName" className="block text-gray-300 text-sm mb-1">Farm Name</label>
          <input
            id="farmName"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40"
            placeholder="e.g. Smith Family Farm"
          />
        </div>
        <div>
          <label htmlFor="farmDesc" className="block text-gray-300 text-sm mb-1">Description (optional)</label>
          <textarea
            id="farmDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40 resize-none"
            placeholder="Brief description of your farm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            Registering...
          </span>
        ) : (
          'Register Farm'
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// JoinFarmForm
// ---------------------------------------------------------------------------

function JoinFarmForm({
  userId, onSuccess,
}: {
  userId: string;
  onSuccess: (farmId: string, role: string) => void;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('id, name')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single();
      if (farmError || !farm) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      const { error: userError } = await supabase
        .from('users')
        .update({ farm_id: farm.id, role: 'member' })
        .eq('id', userId);
      if (userError) throw userError;

      onSuccess(farm.id, 'member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join farm');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-900/60 border border-red-500/40 text-red-200 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="inviteCode" className="block text-gray-300 text-sm mb-1">Invite Code</label>
          <input
            id="inviteCode"
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white uppercase tracking-widest text-center text-lg focus:outline-none focus:border-green-400 placeholder-white/40"
            placeholder="ABC123"
            maxLength={6}
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the 6-character code from your farm admin
          </p>
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            Joining...
          </span>
        ) : (
          'Join Farm'
        )}
      </button>
    </form>
  );
}
