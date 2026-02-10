import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface FarmInviteRow {
  id: string;           // actually the invite code (mapped via sync rules: SELECT code AS id)
  farm_id: string;
  role: string;
  invited_phone: string;
  invited_name: string;
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
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId;

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Query phone-based invites from PowerSync
  const { data: rawInvites } = useQuery<FarmInviteRow>(
    farmId
      ? `SELECT id, farm_id, role, invited_phone, invited_name, expires_at, uses_count, created_at FROM farm_invites WHERE farm_id = ? AND invited_phone IS NOT NULL ORDER BY created_at DESC`
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
      const message = err instanceof Error ? err.message : 'Failed to revoke invite';
      setError(message);
    } finally {
      setRevokingId(null);
    }
  }, []);

  // Empty state
  if (invites.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <UserGroupIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">
          No invites yet. Add a user to invite team members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {invites.map((invite) => {
        const isRevoking = revokingId === invite.id;

        return (
          <div
            key={invite.id}
            className={`bg-gray-800 rounded-lg p-4 border ${
              invite.status === 'Expired' ? 'border-gray-600 opacity-60' : 'border-gray-700'
            }`}
          >
            {/* Header: Name and badges */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">
                {invite.invited_name}
              </span>
              <div className="flex items-center gap-2">
                {/* Role badge */}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    invite.role === 'admin'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {invite.role}
                </span>
                {/* Status badge */}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    invite.status === 'Joined'
                      ? 'bg-green-500/20 text-green-400'
                      : invite.status === 'Expired'
                        ? 'bg-gray-500/20 text-gray-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {invite.status}
                </span>
              </div>
            </div>

            {/* Phone number */}
            <div className="text-sm text-gray-400 mb-3">
              {formatPhone(invite.invited_phone)}
            </div>

            {/* Revoke button — only for Pending invites */}
            {invite.status === 'Pending' && (
              <div className="flex justify-end">
                <button
                  onClick={() => handleRevoke(invite.id)}
                  disabled={isRevoking}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors disabled:opacity-50"
                >
                  {isRevoking ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                  Revoke
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
