import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission, ROLE_DISPLAY_NAMES, ROLE_BADGE_STYLES } from '../lib/permissions';
import type { Role } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { debugError } from '../lib/debugLog';
import PendingInvitesList from '../components/PendingInvitesList';
import AddUserBottomSheet from '../components/AddUserModal';
import ConfirmDeleteMemberDialog from '../components/ConfirmDeleteMemberDialog';

interface FarmMemberRow {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  created_at: string;
}

export default function UsersPage() {
  const { user, onboardingStatus } = useAuth();
  const userRole = useUserRole();
  const farmId = onboardingStatus?.farmId ?? null;
  const canManageUsers = hasPermission(userRole, 'manage_users');

  // Query farm members
  const { data: rawMembers } = useQuery<FarmMemberRow>(
    farmId
      ? 'SELECT id, user_id, role, full_name, created_at FROM farm_members WHERE farm_id = ? ORDER BY created_at ASC'
      : 'SELECT NULL WHERE 0',
    farmId ? [farmId] : []
  );

  const members = useMemo(() => rawMembers ?? [], [rawMembers]);

  // Bottom sheet state
  const [showInviteSheet, setShowInviteSheet] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<FarmMemberRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenInviteSheet = useCallback(() => {
    setShowInviteSheet(true);
  }, []);

  const handleCloseInviteSheet = useCallback(() => {
    setShowInviteSheet(false);
  }, []);

  // --- Delete handlers ---

  const handleDeleteClick = useCallback((member: FarmMemberRow) => {
    setDeleteError(null);
    setDeleteTarget(member);
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || !farmId) return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);

      const { error: rpcError } = await supabase.rpc('remove_farm_member', {
        p_farm_id: farmId,
        p_member_user_id: deleteTarget.user_id,
      });

      if (rpcError) throw rpcError;

      setDeleteTarget(null);
    } catch (err: unknown) {
      let message = 'Failed to remove member';
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('cannot remove yourself')) {
          message = 'You cannot remove yourself from the farm';
        } else if (msg.includes('farm owner')) {
          message = 'Cannot remove the farm owner';
        } else if (msg.includes('not a member')) {
          message = 'This user is no longer a member';
        } else {
          message = err.message;
        }
      }
      debugError('UsersPage', 'Failed to remove member:', err);
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, farmId]);

  const canDeleteMember = useCallback(
    (member: FarmMemberRow): boolean => {
      if (!canManageUsers) return false;
      // Can't delete yourself
      if (member.user_id === user?.id) return false;
      // super_admin can delete any other user
      if (userRole === 'super_admin') return true;
      // grower can delete admin and meter_checker
      if (userRole === 'grower') {
        return member.role === 'admin' || member.role === 'meter_checker';
      }
      // admin can only delete meter_checker
      if (userRole === 'admin') return member.role === 'meter_checker';
      return false;
    },
    [canManageUsers, user?.id, userRole]
  );

  return (
    <div className="min-h-screen bg-[#c5cdb4] pt-14">
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-[#5f7248] tracking-wide mb-4">USERS</h1>

        {/* Error banner */}
        {deleteError && !deleteTarget && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{deleteError}</p>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2 mb-6">
          {members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#5f7248]/70">No members yet</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between bg-[#dfe4d4]"
              >
                <span className="font-medium truncate text-[#5f7248]">
                  {member.full_name || 'Unknown'}
                  {member.user_id === user?.id && (
                    <span className="text-[#5f7248]/50 text-sm ml-1">(You)</span>
                  )}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Role badge */}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_STYLES[member.role as Role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_DISPLAY_NAMES[member.role as Role] ?? member.role}
                  </span>

                  {/* Delete button */}
                  {canDeleteMember(member) && (
                    <button
                      onClick={() => handleDeleteClick(member)}
                      className="p-1 rounded text-[#5f7248]/40 hover:text-red-600 transition-colors"
                      aria-label={`Remove ${member.full_name}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pending Invites Section */}
        {canManageUsers && (
          <section className="mb-24">
            <PendingInvitesList />
          </section>
        )}
      </div>

      {/* Fixed bottom "+ New User" button */}
      {canManageUsers && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#c5cdb4] via-[#c5cdb4] to-transparent">
          <div className="flex justify-center">
            <button
              onClick={handleOpenInviteSheet}
              className="flex items-center gap-2 px-6 py-3 bg-[#5f7248] rounded-full text-white font-medium shadow-sm hover:bg-[#4e6339] transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              New User
            </button>
          </div>
        </div>
      )}

      {/* Add User Bottom Sheet */}
      <AddUserBottomSheet
        open={showInviteSheet}
        onClose={handleCloseInviteSheet}
        callerRole={userRole}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteMemberDialog
        open={deleteTarget !== null}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        memberName={deleteTarget?.full_name ?? 'this member'}
        loading={deleteLoading}
      />
    </div>
  );
}
