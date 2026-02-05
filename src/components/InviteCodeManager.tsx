import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  ClipboardDocumentIcon,
  TrashIcon,
  CheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface FarmInvite {
  code: string;
  role: string;
  expires_at: string;
  max_uses: number | null;
  uses_count: number;
  created_at: string;
}

export default function InviteCodeManager() {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId;

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Query invite codes from PowerSync
  const { data: rawInvites } = useQuery<FarmInvite>(
    farmId
      ? `SELECT code, role, expires_at, max_uses, uses_count, created_at FROM farm_invites WHERE farm_id = ? ORDER BY created_at DESC`
      : 'SELECT NULL WHERE 0',
    farmId ? [farmId] : []
  );

  // Memoize the invites list
  const invites = useMemo(() => rawInvites ?? [], [rawInvites]);

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, []);

  const handleDeleteCode = useCallback(async (code: string) => {
    if (!confirm('Are you sure you want to revoke this invite code?')) return;

    setDeletingCode(code);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('farm_invites')
        .delete()
        .eq('code', code);

      if (deleteError) {
        throw deleteError;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revoke code';
      setError(message);
    } finally {
      setDeletingCode(null);
    }
  }, []);

  // Format expiration in user-friendly way
  const formatExpiry = useCallback((expiresAt: string): string => {
    const date = new Date(expiresAt);
    const now = new Date();

    if (date < now) {
      return 'Expired';
    }

    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Expires today';
    }
    if (diffDays === 1) {
      return 'Expires tomorrow';
    }
    return `Expires in ${diffDays} days`;
  }, []);

  // Check if code is expired
  const isExpired = useCallback((expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  }, []);

  // Empty state
  if (invites.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <UserGroupIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">
          No invite codes yet. Generate one to invite team members.
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
        const expired = isExpired(invite.expires_at);
        const isCopied = copiedCode === invite.code;
        const isDeleting = deletingCode === invite.code;

        return (
          <div
            key={invite.code}
            className={`bg-gray-800 rounded-lg p-4 border ${
              expired ? 'border-gray-600 opacity-60' : 'border-gray-700'
            }`}
          >
            {/* Header: Code and Role Badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-lg text-white tracking-wider">
                {invite.code}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  invite.role === 'admin'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {invite.role}
              </span>
            </div>

            {/* Info: Expiry and Uses */}
            <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
              <span
                className={expired ? 'text-red-400' : ''}
              >
                {formatExpiry(invite.expires_at)}
              </span>
              <span>
                {invite.uses_count}
                {invite.max_uses !== null ? `/${invite.max_uses}` : ''} uses
              </span>
            </div>

            {/* Actions: Copy and Revoke */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCopyCode(invite.code)}
                disabled={expired}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  expired
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : isCopied
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {isCopied ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => handleDeleteCode(invite.code)}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
                Revoke
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
