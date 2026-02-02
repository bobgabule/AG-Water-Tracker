import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function FarmSetupPage() {
  const { user, setFarmOnProfile, signOut } = useAuth();
  const navigate = useNavigate();

  function handleFarmSet(farmId: string, role: string) {
    setFarmOnProfile(farmId, role);
    navigate('/');
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

        {/* Heading */}
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
              <CreateFarmForm
                userId={user!.id}
                onSuccess={handleFarmSet}
              />
            </TabPanel>
            <TabPanel>
              <JoinFarmForm
                userId={user!.id}
                onSuccess={handleFarmSet}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>

        <button
          onClick={signOut}
          className="mt-6 w-full text-center text-sm text-green-300 hover:underline cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function CreateFarmForm({ userId, onSuccess }: { userId: string; onSuccess: (farmId: string, role: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Generate ID client-side to avoid needing a SELECT after INSERT
      // (the farms SELECT RLS policy requires user.farm_id to be set first)
      const farmId = crypto.randomUUID();

      const { error: farmError } = await supabase
        .from('farms')
        .insert({ id: farmId, name, description: description || null });

      if (farmError) throw farmError;

      // Update user record as admin
      const { error: userError } = await supabase
        .from('users')
        .update({
          farm_id: farmId,
          role: 'admin',
        })
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
          <label htmlFor="farmName" className="block text-gray-300 text-sm mb-1">
            Farm Name
          </label>
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
          <label htmlFor="farmDesc" className="block text-gray-300 text-sm mb-1">
            Description (optional)
          </label>
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

function JoinFarmForm({ userId, onSuccess }: { userId: string; onSuccess: (farmId: string, role: string) => void }) {
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

      // Update user record with farm
      const { error: userError } = await supabase
        .from('users')
        .update({
          farm_id: farm.id,
          role: 'member',
        })
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
          <label htmlFor="inviteCode" className="block text-gray-300 text-sm mb-1">
            Invite Code
          </label>
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
