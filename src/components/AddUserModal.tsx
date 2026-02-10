import { useState, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import { debugError } from '../lib/debugLog';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
}

type Role = 'member' | 'admin';

function formatPhoneDisplay(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function AddUserModal({ open, onClose }: AddUserModalProps) {
  const { onboardingStatus } = useAuth();

  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [smsWarning, setSmsWarning] = useState(false);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneDigits(stripped);
  }, []);

  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!onboardingStatus?.farmId) return;

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate phone
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    const fullPhone = `+1${phoneDigits}`;

    try {
      setLoading(true);
      setError('');

      const { error: rpcError } = await supabase.rpc('invite_user_by_phone', {
        p_farm_id: onboardingStatus.farmId,
        p_phone: fullPhone,
        p_name: name.trim(),
        p_role: role,
      });

      if (rpcError) throw rpcError;

      // RPC succeeded — attempt to send SMS
      try {
        const { error: smsError } = await supabase.functions.invoke('send-invite-sms', {
          body: {
            phone: fullPhone,
            farmName: onboardingStatus.farmName,
          },
        });
        if (smsError) {
          debugError('Invite', 'SMS send failed:', smsError);
          setSmsWarning(true);
        }
      } catch (smsErr) {
        debugError('Invite', 'Failed to send invite SMS:', smsErr);
        setSmsWarning(true);
      }

      setSuccess(true);
    } catch (err: unknown) {
      let message = 'Failed to send invite';
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already a member')) {
          message = 'This person is already a member of your farm';
        } else if (msg.includes('already exists')) {
          message = 'An invite for this phone number already exists';
        } else {
          message = err.message;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onboardingStatus?.farmId, onboardingStatus?.farmName, name, phoneDigits, role]);

  const handleClose = useCallback(() => {
    setName('');
    setPhoneDigits('');
    setRole('member');
    setError('');
    setSuccess(false);
    setSmsWarning(false);
    setLoading(false);
    onClose();
  }, [onClose]);

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
            {success ? 'Invite Sent' : 'Add User'}
          </DialogTitle>

          {success ? (
            /* Success state */
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <CheckIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-white font-medium">
                  {smsWarning ? 'User added' : 'Invite sent to'} {formatPhoneDisplay(phoneDigits)}
                </p>
                {smsWarning && (
                  <p className="text-yellow-400 text-sm mt-2">
                    SMS could not be sent. Please notify the user manually.
                  </p>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-lg font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Name input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Enter name"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formatPhoneDisplay(phoneDigits)}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">US phone number (10 digits)</p>
              </div>

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

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={loading || !onboardingStatus?.farmId}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  'Send Invite'
                )}
              </button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
