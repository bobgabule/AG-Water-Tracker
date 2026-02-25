import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { supabase } from '../lib/supabase';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../hooks/useTranslation';

interface FarmInviteRow {
  id: string;           // actually the invite code (mapped via sync rules: SELECT code AS id)
  farm_id: string;
  role: string;
  invited_phone: string;
  invited_first_name: string;
  invited_last_name: string;
  expires_at: string;
  uses_count: number;
  created_at: string;
}

type InviteStatus = 'Joined' | 'Expired' | 'Pending';

interface MappedInvite extends FarmInviteRow {
  status: InviteStatus;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PendingInvitesList() {
  const { t } = useTranslation();
  const { farmId } = useActiveFarm();

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Query phone-based invites from PowerSync
  const { data: rawInvites } = useQuery<FarmInviteRow>(
    farmId
      ? `SELECT id, farm_id, role, invited_phone, invited_first_name, invited_last_name, expires_at, uses_count, created_at FROM farm_invites WHERE farm_id = ? AND invited_phone IS NOT NULL ORDER BY created_at DESC`
      : 'SELECT NULL WHERE 0',
    farmId ? [farmId] : []
  );

  // Memoize mapped invites with computed status
  const invites = useMemo<MappedInvite[]>(() => {
    if (!rawInvites) return [];
    return rawInvites.map((invite) => {
      let status: InviteStatus;
      if (invite.uses_count >= 1) {
        status = 'Joined';
      } else if (new Date(invite.expires_at) < new Date()) {
        status = 'Expired';
      } else {
        status = 'Pending';
      }
      return { ...invite, status };
    });
  }, [rawInvites]);

  const handleRevoke = useCallback(async (code: string) => {
    setRevokingId(code);
    setError(null);

    try {
      const { error: revokeError } = await supabase.rpc('revoke_farm_invite', {
        p_code: code,
      });

      if (revokeError) throw revokeError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('invite.failedRevoke');
      setError(message);
    } finally {
      setRevokingId(null);
    }
  }, []);

  if (invites.length === 0) return null;

  const STATUS_CLASSES: Record<InviteStatus, string> = {
    Joined: 'text-green-700',
    Expired: 'text-gray-400',
    Pending: 'text-yellow-600',
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-heading mb-3">{t('invite.title')}</h2>

      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {invites.map((invite) => {
          const isRevoking = revokingId === invite.id;

          return (
            <div
              key={invite.id}
              className={`bg-surface-card rounded-lg px-4 py-3 flex items-center justify-between ${
                invite.status === 'Expired' ? 'opacity-60' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-text-heading font-medium">
                  {invite.invited_first_name} {invite.invited_last_name}
                </span>
                <span className="text-text-heading/50 text-xs ml-2">
                  {formatPhone(invite.invited_phone)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-sm ${STATUS_CLASSES[invite.status]}`}>
                  {invite.status === 'Joined' ? t('invite.statusJoined') : invite.status === 'Expired' ? t('invite.statusExpired') : t('invite.statusPending')}
                </span>
                {invite.status === 'Pending' && (
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={isRevoking}
                    className="p-1 rounded text-text-heading/40 hover:text-red-600 transition-colors disabled:opacity-50"
                    aria-label={`Revoke invite for ${invite.invited_first_name}`}
                  >
                    {isRevoking ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
