import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/auth/AuthLayout';

/**
 * JoinFarmPage - Farm joining step of onboarding flow.
 * Accepts a 6-character invite code to join an existing farm.
 * Uses RPC to validate code and create farm membership.
 */
export default function JoinFarmPage() {
  const { refreshOnboardingStatus } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeChange = useCallback((value: string) => {
    // Only allow alphanumeric characters, convert to uppercase
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setCode(cleaned.slice(0, 6));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const cleanCode = code.trim().toUpperCase();
      if (cleanCode.length !== 6) {
        setError('Please enter a 6-character invite code');
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Call RPC to join farm with invite code
        const { error: rpcError } = await supabase.rpc('join_farm_with_code', {
          p_code: cleanCode,
        });

        if (rpcError) {
          // Parse error message for user-friendly display
          if (rpcError.message.includes('Invalid or expired')) {
            throw new Error('This invite code is invalid or has expired');
          }
          if (rpcError.message.includes('Already a member')) {
            throw new Error('You are already a member of this farm');
          }
          throw rpcError;
        }

        await refreshOnboardingStatus();
        navigate('/app/dashboard', { replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to join farm';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [code, refreshOnboardingStatus, navigate]
  );

  const handleBack = useCallback(() => {
    navigate('/onboarding/farm');
  }, [navigate]);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-white text-center mb-2">
        Join a Farm
      </h1>
      <p className="text-gray-300 text-center mb-8">
        Enter the invite code from your farm admin
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="inviteCode" className="block text-gray-300 text-sm mb-1">
            Invite Code <span className="text-red-400">*</span>
          </label>
          <input
            id="inviteCode"
            type="text"
            required
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-center text-2xl tracking-[0.3em] uppercase placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="ABC123"
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <p className="text-xs text-gray-400 mt-2 text-center">
            The code is 6 characters (letters and numbers)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Joining...
            </span>
          ) : (
            'Join Farm'
          )}
        </button>
      </form>

      <button
        onClick={handleBack}
        className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back
      </button>
    </AuthLayout>
  );
}
