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
import { useTranslation } from '../hooks/useTranslation';

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
  const { t } = useTranslation();
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
      setError(t('user.firstNameRequired'));
      return;
    }
    if (!lastName.trim()) {
      setError(t('user.lastNameRequired'));
      return;
    }
    if (phoneDigits.length !== 10) {
      setError(t('user.invalidPhone'));
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
      let message = t('user.failedInvite');
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already a member')) {
          message = t('user.alreadyMember');
        } else if (msg.includes('already exists')) {
          message = t('user.alreadyInvited');
        } else if (msg.includes('no available')) {
          message = err.message;
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

  const canSelectAdmin = callerRole === 'owner' || callerRole === 'super_admin';

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end">
        <DialogPanel
          transition
          className="w-full bg-surface-modal shadow-xl transition duration-300 ease-out data-[closed]:translate-y-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-surface-modal p-4 pt-6 flex-shrink-0">
            <h2 className="text-white font-bold text-lg tracking-wide">
              {success ? t('user.inviteSent') : t('user.addNewUser')}
            </h2>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 pb-[30px]">
            {success ? (
              <div className="py-6 text-center">
                <CheckIcon className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-white font-medium">
                  {t('user.inviteSentTo', { type: smsWarning ? t('user.userAdded') : t('user.inviteSentLabel'), phone: formatPhoneDisplay(phoneDigits) })}
                </p>
                {smsWarning && (
                  <p className="text-yellow-600 text-sm mt-2">
                    {t('user.smsWarning')}
                  </p>
                )}
              </div>
            ) : !tier ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-white font-medium">{t('user.loadingLimits')}</p>
              </div>
            ) : allSeatsFull ? (
              <div className="py-8 text-center">
                <p className="text-white font-medium mb-2">{t('user.allSeatsFull')}</p>
                <p className="text-white/70 text-sm mb-4">
                  {t('user.seatLimitDesc', { adminLimit: String(seatUsage?.admin.limit ?? 0), mcLimit: String(seatUsage?.meter_checker.limit ?? 0) })}
                </p>
                {(callerRole === 'owner' || callerRole === 'super_admin') && upgradeUrl ? (
                  <a
                    href={upgradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-btn-confirm font-medium mt-2 hover:text-white transition-colors"
                  >
                    {t('limit.upgradePlan')}
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </a>
                ) : (callerRole === 'owner' || callerRole === 'super_admin') && !upgradeUrl ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-btn-confirm/50 font-medium mt-2">
                    {t('limit.upgradePlan')}
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </span>
                ) : (
                  <p className="text-yellow-300 text-sm font-medium">
                    {t('user.contactOwner')}
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
                    <label className="text-xs text-white mb-2 block">{t('user.firstName')}*</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={handleFirstNameChange}
                      placeholder={t('user.firstNamePlaceholder')}
                      autoComplete="given-name"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-surface-header/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-white mb-2 block">{t('user.lastName')}*</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={handleLastNameChange}
                      placeholder={t('user.lastNamePlaceholder')}
                      autoComplete="family-name"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-surface-header/30"
                    />
                  </div>
                </div>

                {/* Phone input */}
                <div>
                  <label className="text-xs text-white mb-2 block">{t('user.phoneNumber')}*</label>
                  <input
                    type="tel"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-surface-header/30"
                  />
                  <p className="text-xs text-white mt-2">{t('auth.usPhoneHint')}</p>
                </div>

                {/* Role selection */}
                {canSelectAdmin ? (
                  <div>
                    <label className="text-xs text-white mb-2 block">{t('user.role')}*</label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleRoleChange('meter_checker')}
                        disabled={meterCheckerFull}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${role === 'meter_checker'
                          ? 'bg-control-active-alt text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {t('user.meterCheckerLabel')}{meterCheckerFull ? ` ${t('user.full')}` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleChange('admin')}
                        disabled={adminFull}
                        className={`flex-1 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${role === 'admin'
                          ? 'bg-control-active-alt text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {t('user.adminLabel')}{adminFull ? ` ${t('user.full')}` : ''}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t('user.role')}</label>
                    <div className="py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                      {t('user.meterCheckerLabel')}{meterCheckerFull ? ` ${t('user.full')}` : ''}
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
              {success ? t('user.done') : t('common.cancel')}
            </button>
            {!success && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !farmId || !tier || (role === 'admin' ? adminFull : meterCheckerFull)}
                className="px-6 py-2.5 bg-btn-confirm text-btn-confirm-text rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-header-hover transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('user.sending')}
                  </>
                ) : (
                  t('user.sendInvite')
                )}
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
