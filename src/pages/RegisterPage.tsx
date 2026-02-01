import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../lib/AuthContext';

export default function RegisterPage() {
  const { user, userProfile, loading, createProfile } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile) {
    return <Navigate to={userProfile.organization_id ? '/' : '/setup'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createProfile({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
      navigate('/setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(20, 40, 60, 0.7), rgba(10, 30, 20, 0.85)),
            url('/bg-farm.jpg')`,
          backgroundColor: '#1a3a2a',
        }}
      />

      {/* Fallback gradient if no image */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/80 via-emerald-900/70 to-green-950/90 -z-10" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="text-green-400">AG</span>{' '}
            <span className="text-white">Water</span>
          </h1>
          <h2 className="text-4xl font-bold text-white -mt-1">Tracker</h2>
        </div>

        {/* Register heading */}
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
              <label htmlFor="firstName" className="block text-gray-300 text-sm mb-1">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40"
                placeholder="First"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-gray-300 text-sm mb-1">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-green-400 placeholder-white/40"
                placeholder="Last"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-gray-300 text-sm mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
      </div>
    </div>
  );
}
