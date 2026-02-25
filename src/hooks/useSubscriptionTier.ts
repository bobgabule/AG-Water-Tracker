import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierRow {
  id: string;
  display_name: string;
  max_admins: number;
  max_meter_checkers: number;
  max_wells: number;
}

export interface SubscriptionTierInfo {
  /** Tier slug, e.g. 'starter' or 'pro' */
  slug: string;
  /** Human-readable name, e.g. 'Starter Plan' */
  displayName: string;
  /** Max admin seats for this tier */
  maxAdmins: number;
  /** Max meter checker seats for this tier */
  maxMeterCheckers: number;
  /** Max wells allowed for this tier */
  maxWells: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current farm's subscription tier limits from PowerSync.
 *
 * Single JOIN query: reads the farm's tier slug and looks up the tier details
 * in one round-trip to the local SQLite database.
 *
 * Returns `null` while loading or if no farm is available.
 */
export function useSubscriptionTier(): SubscriptionTierInfo | null {
  const { farmId } = useActiveFarm();

  const query = farmId
    ? `SELECT st.id, st.display_name, st.max_admins, st.max_meter_checkers, st.max_wells
       FROM farms f
       JOIN subscription_tiers st ON f.subscription_tier = st.id
       WHERE f.id = ?`
    : 'SELECT NULL WHERE 0';

  const { data: tierData } = useQuery<TierRow>(
    query,
    farmId ? [farmId] : []
  );

  return useMemo(() => {
    if (!tierData || tierData.length === 0) return null;
    const row = tierData[0];
    return {
      slug: row.id,
      displayName: row.display_name,
      maxAdmins: row.max_admins,
      maxMeterCheckers: row.max_meter_checkers,
      maxWells: row.max_wells,
    };
  }, [tierData]);
}
