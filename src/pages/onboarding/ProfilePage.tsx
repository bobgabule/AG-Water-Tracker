import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/auth/AuthLayout';

/**
 * ProfilePage - First step of onboarding flow.
 * Collects user's first name, last name, and optional email.
 * Upserts data to the users table and navigates to farm choice.
 */
export default function ProfilePage() {
  const { user, refreshOnboardingStatus, signOut } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guard against null user during initial auth load or session expiry
  if (!user) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!user) {
        setError('You must be logged in to complete your profile');
        return;
      }

      if (!firstName.trim() || !lastName.trim()) {
        setError('First and last name are required');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Upsert to users table
        const { error: upsertError } = await supabase.from('users').upsert({
          id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          display_name: `${firstName.trim()} ${lastName.trim()}`,
          phone: user.phone,
        });

        if (upsertError) throw upsertError;

        await refreshOnboardingStatus();
        navigate('/onboarding/farm', { replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save profile';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [user, firstName, lastName, email, refreshOnboardingStatus, navigate]
  );

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        Complete Your Profile
      </h1>
      <p className="text-gray-300 text-center mb-8">
        Tell us a bit about yourself
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label
              htmlFor="firstName"
              className="block text-gray-300 text-sm mb-1"
            >
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="First name"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-gray-300 text-sm mb-1"
            >
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Last name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm mb-1">
              Email <span className="text-gray-500">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="email@example.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      <button
        onClick={signOut}
        className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Sign out
      </button>
    </AuthLayout>
  );
}
