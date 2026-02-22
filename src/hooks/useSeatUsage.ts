import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import { useSubscriptionTier } from './useSubscriptionTier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleSeatUsage {
  /** Number of seats currently used (active members + pending invites) */
  used: number;
  /** Maximum seats allowed by plan */
  limit: number;
  /** Remaining seats (min 0) */
  available: number;
  /** Whether all seats for this role are taken */
  isFull: boolean;
}

export interface SeatUsage {
  admin: RoleSeatUsage;
  meter_checker: RoleSeatUsage;
}

// ---------------------------------------------------------------------------
// Query Row Type
// ---------------------------------------------------------------------------

interface RoleCountRow {
  role: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Seat-limited roles for SQL IN clause
// ---------------------------------------------------------------------------

const SEAT_LIMITED_ROLES = ['admin', 'meter_checker'];
const ROLES_PLACEHOLDER = SEAT_LIMITED_ROLES.map(() => '?').join(', ');

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns per-role seat usage for the current farm.
 *
 * Counts farm members AND pending (unused, non-expired) invites per
 * seat-limited role, then compares against the farm's subscription tier limits.
 *
 * Exempt roles (grower, super_admin) are excluded from counting.
 * Used or expired invites are excluded.
 */
export function useSeatUsage(): SeatUsage {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;
  const tier = useSubscriptionTier();

  // --- Active members query (seat-limited roles only) ---
  const membersQuery = farmId
    ? `SELECT role, COUNT(*) as count FROM farm_members WHERE farm_id = ? AND role IN (${ROLES_PLACEHOLDER}) GROUP BY role`
    : 'SELECT NULL WHERE 0';

  const membersParams = farmId ? [farmId, ...SEAT_LIMITED_ROLES] : [];

  const { data: membersData } = useQuery<RoleCountRow>(
    membersQuery,
    membersParams
  );

  // --- Pending invites query (unused, not expired, seat-limited roles only) ---
  const now = useMemo(() => new Date().toISOString(), []);

  const invitesQuery = farmId
    ? `SELECT role, COUNT(*) as count FROM farm_invites WHERE farm_id = ? AND uses_count = 0 AND expires_at > ? AND role IN (${ROLES_PLACEHOLDER}) GROUP BY role`
    : 'SELECT NULL WHERE 0';

  const invitesParams = farmId ? [farmId, now, ...SEAT_LIMITED_ROLES] : [];

  const { data: invitesData } = useQuery<RoleCountRow>(
    invitesQuery,
    invitesParams
  );

  // --- Combine counts and compare against tier limits ---
  return useMemo(() => {
    // Build lookup maps from query results
    const memberCounts = new Map<string, number>();
    for (const row of membersData) {
      memberCounts.set(row.role, row.count);
    }

    const inviteCounts = new Map<string, number>();
    for (const row of invitesData) {
      inviteCounts.set(row.role, row.count);
    }

    // Calculate usage for each seat-limited role
    function calcRole(role: string, tierLimit: number): RoleSeatUsage {
      const members = memberCounts.get(role) ?? 0;
      const invites = inviteCounts.get(role) ?? 0;
      const used = members + invites;
      const limit = tierLimit;
      const available = Math.max(0, limit - used);
      const isFull = used >= limit;
      return { used, limit, available, isFull };
    }

    return {
      admin: calcRole('admin', tier?.maxAdmins ?? 0),
      meter_checker: calcRole('meter_checker', tier?.maxMeterCheckers ?? 0),
    };
  }, [membersData, invitesData, tier]);
}
