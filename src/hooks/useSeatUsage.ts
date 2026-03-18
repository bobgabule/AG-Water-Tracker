import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';
import { useSubscriptionTier } from './useSubscriptionTier';
import { supabase } from '../lib/supabase';

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
 * Counts farm members (via PowerSync) AND pending invites (via Supabase)
 * per seat-limited role, then compares against the farm's subscription tier limits.
 *
 * Exempt roles (owner, super_admin) are excluded from counting.
 * Used or expired invites are excluded.
 */
export function useSeatUsage(): SeatUsage {
  const { farmId } = useActiveFarm();
  const tier = useSubscriptionTier();

  // --- Farm extra seats query (PowerSync — farms table still synced) ---
  const farmQuery = farmId
    ? 'SELECT extra_admin_seats, extra_meter_checker_seats FROM farms WHERE id = ?'
    : 'SELECT NULL WHERE 0';
  const farmParams = farmId ? [farmId] : [];
  const { data: farmData } = useQuery<{ extra_admin_seats: number; extra_meter_checker_seats: number }>(
    farmQuery,
    farmParams
  );

  // --- Active members query (PowerSync — farm_members still synced) ---
  const membersQuery = farmId
    ? `SELECT role, COUNT(*) as count FROM farm_members WHERE farm_id = ? AND role IN (${ROLES_PLACEHOLDER}) GROUP BY role`
    : 'SELECT NULL WHERE 0';

  const membersParams = farmId ? [farmId, ...SEAT_LIMITED_ROLES] : [];

  const { data: membersData } = useQuery<RoleCountRow>(
    membersQuery,
    membersParams
  );

  // --- Pending invites query (Supabase — farm_invites removed from sync) ---
  const [inviteCounts, setInviteCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!farmId) {
      setInviteCounts(new Map());
      return;
    }

    let cancelled = false;

    supabase
      .from('farm_invites')
      .select('role')
      .eq('farm_id', farmId)
      .eq('uses_count', 0)
      .gt('expires_at', new Date().toISOString())
      .in('role', SEAT_LIMITED_ROLES)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setInviteCounts(new Map());
          return;
        }

        const counts = new Map<string, number>();
        for (const row of data as { role: string }[]) {
          counts.set(row.role, (counts.get(row.role) ?? 0) + 1);
        }
        setInviteCounts(counts);
      });

    return () => { cancelled = true; };
  }, [farmId]);

  // --- Combine counts and compare against tier limits ---
  return useMemo(() => {
    const memberCounts = new Map<string, number>();
    for (const row of membersData) {
      memberCounts.set(row.role, row.count);
    }

    const extraAdminSeats = farmData[0]?.extra_admin_seats ?? 0;
    const extraMeterReaderSeats = farmData[0]?.extra_meter_checker_seats ?? 0;

    function calcRole(role: string, tierLimit: number, extraSeats: number): RoleSeatUsage {
      const members = memberCounts.get(role) ?? 0;
      const invites = inviteCounts.get(role) ?? 0;
      const used = members + invites;
      const limit = tierLimit + extraSeats;
      const available = Math.max(0, limit - used);
      const isFull = used >= limit;
      return { used, limit, available, isFull };
    }

    return {
      admin: calcRole('admin', tier?.maxAdmins ?? 0, extraAdminSeats),
      meter_checker: calcRole('meter_checker', tier?.maxMeterReaders ?? 0, extraMeterReaderSeats),
    };
  }, [membersData, inviteCounts, tier, farmData]);
}
