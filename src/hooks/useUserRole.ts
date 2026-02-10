import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import type { Role } from '../lib/permissions';

interface RoleRow {
  role: string;
}

/**
 * Hook to get the current user's role from the farm_members table.
 * Must be used within PowerSyncProvider.
 *
 * The authoritative role source is farm_members (not the users table).
 * Returns the typed Role for the user's current farm, or null if
 * the user/farm is unknown or no membership exists.
 */
export function useUserRole(): Role | null {
  const { user, onboardingStatus } = useAuth();
  const userId = user?.id ?? null;
  const farmId = onboardingStatus?.farmId ?? null;

  // Guard against empty userId or farmId to avoid unnecessary database queries
  const query =
    userId && farmId
      ? 'SELECT role FROM farm_members WHERE user_id = ? AND farm_id = ?'
      : 'SELECT NULL WHERE 0';

  const { data } = useQuery<RoleRow>(query, userId && farmId ? [userId, farmId] : []);

  return useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0].role as Role;
  }, [data]);
}
