import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { Switch } from '@headlessui/react';
import { PlusIcon, TrashIcon, NoSymbolIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission, ROLE_DISPLAY_NAMES, ROLE_BADGE_STYLES } from '../lib/permissions';
import type { Role } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { debugError } from '../lib/debugLog';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { PLAN_LIMITS } from '../lib/subscription';
import PendingInvitesList from '../components/PendingInvitesList';
import AddUserBottomSheet from '../components/AddUserModal';
import ConfirmDeleteMemberDialog from '../components/ConfirmDeleteMemberDialog';
import ConfirmDisableMemberDialog from '../components/ConfirmDisableMemberDialog';

interface FarmMemberRow {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  is_disabled: number;
  created_at: string;
}

export default function UsersPage() {
  const { user, onboardingStatus } = useAuth();
  const userRole = useUserRole();
  const farmId = onboardingStatus?.farmId ?? null;
  const canManageUsers = hasPermission(userRole, 'manage_users');
  const seatUsage = useSeatUsage();

  // Query farm members (including disabled -- filtering is client-side)
  const { data: rawMembers } = useQuery<FarmMemberRow>(
    farmId
      ? 'SELECT id, user_id, role, full_name, is_disabled, created_at FROM farm_members WHERE farm_id = ? ORDER BY created_at ASC'
      : 'SELECT NULL WHERE 0',
    farmId ? [farmId] : []
  );

  // Toggle for showing disabled users
  const [showDisabled, setShowDisabled] = useState(false);

  const members = useMemo(() => {
    const all = rawMembers ?? [];
    if (showDisabled) return all;
    return all.filter(m => !m.is_disabled);
  }, [rawMembers, showDisabled]);

  // Bottom sheet state
  const [showInviteSheet, setShowInviteSheet] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<FarmMemberRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Disable/enable state
  const [disableTarget, setDisableTarget] = useState<FarmMemberRow | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // --- Disable/enable handlers ---

  const handleDisableClick = useCallback((member: FarmMemberRow) => {
    setActionError(null);
    setDisableTarget(member);
  }, []);

  const handleDisableClose = useCallback(() => {
    setDisableTarget(null);
    setActionError(null);
  }, []);

  const handleDisableConfirm = useCallback(async () => {
    if (!disableTarget || !farmId) return;

    try {
      setDisableLoading(true);
      setActionError(null);

      const { error: rpcError } = await supabase.rpc('disable_farm_member', {
        p_farm_id: farmId,
        p_member_user_id: disableTarget.user_id,
      });

      if (rpcError) throw rpcError;

      setDisableTarget(null);
    } catch (err: unknown) {
      let message = 'Failed to disable member';
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('cannot disable yourself')) {
          message = 'You cannot disable yourself';
        } else if (msg.includes('not a member')) {
          message = 'This user is no longer a member';
        } else if (msg.includes('already disabled')) {
          message = 'This user is already disabled';
        } else {
          message = err.message;
        }
      }
      debugError('UsersPage', 'Failed to disable member:', err);
      setActionError(message);
    } finally {
      setDisableLoading(false);
    }
  }, [disableTarget, farmId]);

  const handleEnable = useCallback(async (member: FarmMemberRow) => {
    if (!farmId) return;
    try {
      setDisableLoading(true);
      setActionError(null);
      const { error } = await supabase.rpc('enable_farm_member', {
        p_farm_id: farmId,
        p_member_user_id: member.user_id,
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to enable member';
      debugError('UsersPage', 'Failed to enable member:', err);
      setActionError(message);
    } finally {
      setDisableLoading(false);
    }
  }, [farmId]);

  const canDisableMember = useCallback(
    (member: FarmMemberRow): boolean => {
      if (!canManageUsers) return false;
      // Can't disable yourself
      if (member.user_id === user?.id) return false;
      // super_admin can disable any other user
      if (userRole === 'super_admin') return true;
      // grower can disable admin and meter_checker
      if (userRole === 'grower') {
        return member.role === 'admin' || member.role === 'meter_checker';
      }
      // admin can only disable meter_checker
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

        {/* Seat usage summary */}
        {canManageUsers && seatUsage && (
          <div className="bg-[#dfe4d4] rounded-lg p-3 mb-4">
            <h2 className="text-xs font-semibold text-[#5f7248]/70 uppercase tracking-wider mb-2">
              {PLAN_LIMITS.name} Plan
            </h2>
            <div className="space-y-1">
              {/* Admin seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Admins</span>
                <span className={`text-sm font-medium ${seatUsage.admin.isFull ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {seatUsage.admin.used} / {seatUsage.admin.limit}
                  {seatUsage.admin.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
              {/* Meter Checker seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Meter Checkers</span>
                <span className={`text-sm font-medium ${seatUsage.meter_checker.isFull ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {seatUsage.meter_checker.used} / {seatUsage.meter_checker.limit}
                  {seatUsage.meter_checker.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Show disabled users toggle */}
        {canManageUsers && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[#5f7248]/70">Show disabled users</span>
            <Switch
              checked={showDisabled}
              onChange={setShowDisabled}
              className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition data-[checked]:bg-[#5f7248]"
            >
              <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
            </Switch>
          </div>
        )}

        {/* Error banners */}
        {deleteError && !deleteTarget && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{deleteError}</p>
          </div>
        )}
        {actionError && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{actionError}</p>
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
                className={`rounded-lg px-4 py-3 flex items-center justify-between ${member.is_disabled ? 'bg-gray-200 opacity-60' : 'bg-[#dfe4d4]'}`}
              >
                <span className={`font-medium truncate ${member.is_disabled ? 'text-gray-500 line-through' : 'text-[#5f7248]'}`}>
                  {member.full_name || 'Unknown'}
                  {member.user_id === user?.id && (
                    <span className="text-[#5f7248]/50 text-sm ml-1">(You)</span>
                  )}
                  {member.is_disabled === 1 && (
                    <span className="text-xs ml-2 text-red-500 font-normal no-underline">(Disabled)</span>
                  )}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Role badge */}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE_STYLES[member.role as Role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_DISPLAY_NAMES[member.role as Role] ?? member.role}
                  </span>

                  {/* Enable button (only for disabled members) */}
                  {member.is_disabled === 1 && canDisableMember(member) && (
                    <button
                      onClick={() => handleEnable(member)}
                      disabled={disableLoading}
                      className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      Enable
                    </button>
                  )}

                  {/* Disable button (only for active members) */}
                  {!member.is_disabled && canDisableMember(member) && (
                    <button
                      onClick={() => handleDisableClick(member)}
                      className="p-1 rounded text-[#5f7248]/40 hover:text-orange-600 transition-colors"
                      aria-label={`Disable ${member.full_name}`}
                    >
                      <NoSymbolIcon className="h-4 w-4" />
                    </button>
                  )}

                  {/* Delete button (only for active members) */}
                  {!member.is_disabled && canDeleteMember(member) && (
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

      {/* Confirm Disable Dialog */}
      <ConfirmDisableMemberDialog
        open={disableTarget !== null}
        onClose={handleDisableClose}
        onConfirm={handleDisableConfirm}
        memberName={disableTarget?.full_name ?? 'this member'}
        loading={disableLoading}
      />
    </div>
  );
}
