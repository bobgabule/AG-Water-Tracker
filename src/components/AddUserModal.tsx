import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { CheckIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { supabase } from '../lib/supabase';
import { debugError } from '../lib/debugLog';
import { useAppSetting } from '../hooks/useAppSetting';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { buildSubscriptionUrl } from '../lib/subscriptionUrls';

interface AddUserBottomSheetProps {
  open: boolean;
  onClose: () => void;
  callerRole: string | null;
}

type Role = 'meter_checker' | 'admin';

function formatPhoneDisplay(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function AddUserBottomSheet({ open, onClose, callerRole }: AddUserBottomSheetProps) {
  const { farmId, farmName } = useActiveFarm();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [role, setRole] = useState<Role>('meter_checker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [smsWarning, setSmsWarning] = useState(false);

  const tier = useSubscriptionTier();
  const seatUsage = useSeatUsage();
  const subscriptionUrl = useAppSetting('subscription_website_url');
  const upgradeUrl = subscriptionUrl && farmId && tier
    ? buildSubscriptionUrl(subscriptionUrl, farmId, tier.slug)
    : null;
  const adminFull = seatUsage?.admin.isFull ?? false;
  const meterCheckerFull = seatUsage?.meter_checker.isFull ?? false;
  const allSeatsFull = adminFull && meterCheckerFull;

  // Auto-correct selected role if it becomes full
  useEffect(() => {
    if (!seatUsage) return;
    if (role === 'admin' && adminFull && !meterCheckerFull) {
      setRole('meter_checker');
    } else if (role === 'meter_checker' && meterCheckerFull && !adminFull) {
      setRole('admin');
    }
  }, [seatUsage, role, adminFull, meterCheckerFull]);

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
  }, []);

  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneDigits(stripped);
  }, []);

  const handleRoleChange = useCallback((newRole: Role) => {
    setRole(newRole);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!farmId) return;

    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (phoneDigits.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    const fullPhone = `+1${phoneDigits}`;

    try {
      setLoading(true);
      setError('');

      const { error: rpcError } = await supabase.rpc('invite_user_by_phone', {
        p_farm_id: farmId,
        p_phone: fullPhone,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_role: role,
      });

      if (rpcError) throw rpcError;

      // Attempt SMS
      try {
        const { error: smsError } = await supabase.functions.invoke('send-invite-sms', {
          body: {
            phone: fullPhone,
            farmName: farmName,
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
  }, [farmId, farmName, firstName, lastName, phoneDigits, role]);

  const handleClose = useCallback(() => {
    setFirstName('');
    setLastName('');
    setPhoneDigits('');
    setRole('meter_checker');
    setError('');
    setSuccess(false);
    setSmsWarning(false);
    setLoading(false);
    onClose();
  }, [onClose]);

  const canSelectAdmin = callerRole === 'grower' || callerRole === 'super_admin';

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end">
        <DialogPanel
          transition
          className="w-full bg-[#526640] shadow-xl transition duration-300 ease-out data-[closed]:translate-y-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-[#526640] p-4 pt-6 flex-shrink-0">
            <h2 className="text-white font-bold text-lg tracking-wide">
              {success ? 'INVITE SENT' : 'ADD NEW USER'}
            </h2>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 pb-[30px]">
            {success ? (
              <div className="py-6 text-center">
                <CheckIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-white font-medium">
                  {smsWarning ? 'User added' : 'Invite sent to'} {formatPhoneDisplay(phoneDigits)}
                </p>
                {smsWarning && (
                  <p className="text-yellow-600 text-sm mt-2">
                    SMS could not be sent. Please notify the user manually.
                  </p>
                )}
              </div>
            ) : !tier ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-white font-medium">Loading plan limits...</p>
              </div>
            ) : allSeatsFull ? (
              <div className="py-8 text-center">
                <p className="text-white font-medium mb-2">All seats are filled</p>
                <p className="text-white/70 text-sm mb-4">
                  Your plan allows {seatUsage?.admin.limit ?? 0} admin and {seatUsage?.meter_checker.limit ?? 0} meter checkers.
                </p>
                {(callerRole === 'grower' || callerRole === 'super_admin') && upgradeUrl ? (
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#bdefda] font-medium mt-2 hover:text-white transition-colors"
                  >
                    Upgrade Plan
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                ) : (callerRole === 'grower' || callerRole === 'super_admin') && !upgradeUrl ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#bdefda]/50 font-medium mt-2">
                    Upgrade Plan
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </span>
                ) : (
                  <p className="text-yellow-300 text-sm font-medium">
                    Contact your farm owner to upgrade
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Name inputs */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-white mb-2 block">First Name*</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={handleFirstNameChange}
                      placeholder="First name"
                      autoComplete="given-name"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f7248]/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-white mb-2 block">Last Name*</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={handleLastNameChange}
                      placeholder="Last name"
                      autoComplete="family-name"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f7248]/30"
                    />
                  </div>
                </div>

                {/* Phone input */}
                <div>
                  <label className="text-xs text-white mb-2 block">Phone Number*</label>
                  <input
                    type="tel"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5f7248]/30"
                  />
                  <p className="text-xs text-white mt-2">US phone number (10 digits)</p>
                </div>

                {/* Role selection */}
                {canSelectAdmin ? (
                  <div>
                    <label className="text-xs text-white mb-2 block">Role*</label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleRoleChange('meter_checker')}
                        disabled={meterCheckerFull}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${role === 'meter_checker'
                          ? 'bg-[#8ca074] text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        Meter Checker{meterCheckerFull ? ' (Full)' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange('admin')}
                        disabled={adminFull}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${role === 'admin'
                          ? 'bg-[#8ca074] text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        Admin{adminFull ? ' (Full)' : ''}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Role</label>
                    <div className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                      Meter Checker{meterCheckerFull ? ' (Full)' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center px-4 py-6 border-0 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 text-white font-medium"
            >
              {success ? 'Done' : 'Cancel'}
            </button>
            {!success && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !farmId || !tier || (role === 'admin' ? adminFull : meterCheckerFull)}
                className="px-6 py-2.5 bg-[#bdefda] text-[#506741] rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4e6339] transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
