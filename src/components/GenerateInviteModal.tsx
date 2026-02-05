import { useState, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';

interface GenerateInviteModalProps {
  open: boolean;
  onClose: () => void;
}

type Role = 'member' | 'admin';

const expiryOptions = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
];

const maxUsesOptions = [
  { value: null, label: 'Unlimited' },
  { value: 1, label: '1 use' },
  { value: 5, label: '5 uses' },
  { value: 10, label: '10 uses' },
  { value: 25, label: '25 uses' },
];

export default function GenerateInviteModal({ open, onClose }: GenerateInviteModalProps) {
  const { onboardingStatus } = useAuth();

  const [role, setRole] = useState<Role>('member');
  const [expiresDays, setExpiresDays] = useState(7);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!onboardingStatus?.farmId) return;

    try {
      setLoading(true);
      setError('');

      const { data, error: rpcError } = await supabase.rpc('create_invite_code', {
        p_farm_id: onboardingStatus.farmId,
        p_role: role,
        p_expires_days: expiresDays,
        p_max_uses: maxUses,
      });

      if (rpcError) throw rpcError;
      setGeneratedCode(data as string);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate code';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onboardingStatus?.farmId, role, expiresDays, maxUses]);

  const handleCopy = useCallback(async () => {
    if (!generatedCode) return;

    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [generatedCode]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setGeneratedCode(null);
    setError('');
    setRole('member');
    setExpiresDays(7);
    setMaxUses(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
  }, []);

  const handleExpiryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setExpiresDays(parseInt(e.target.value, 10));
  }, []);

  const handleMaxUsesChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMaxUses(value === 'null' ? null : parseInt(value, 10));
  }, []);

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md bg-gray-800 rounded-2xl p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <DialogTitle className="text-xl font-semibold text-white mb-6">
            {generatedCode ? 'Invite Code Generated' : 'Generate Invite Code'}
          </DialogTitle>

          {generatedCode ? (
            // Success state - show generated code
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400 mb-2">Share this code with your team member</p>
                <p className="font-mono text-2xl text-white tracking-widest">{generatedCode}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCopy}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-5 w-5" />
                      Copy Code
                    </>
                  )}
                </button>

                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-lg font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            // Form state - configure and generate
            <div className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Role selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Role</label>
                <div className="flex rounded-lg border border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('member')}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      role === 'member'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Member
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      role === 'admin'
                        ? 'bg-primary text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Admin
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {role === 'admin'
                    ? 'Admins can manage wells, team members, and settings'
                    : 'Members can view and record meter readings'}
                </p>
              </div>

              {/* Expiration selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Expires After</label>
                <select
                  value={expiresDays}
                  onChange={handleExpiryChange}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {expiryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max uses selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Maximum Uses</label>
                <select
                  value={maxUses === null ? 'null' : maxUses}
                  onChange={handleMaxUsesChange}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {maxUsesOptions.map((option) => (
                    <option key={String(option.value)} value={option.value === null ? 'null' : option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !onboardingStatus?.farmId}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Code'
                )}
              </button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
