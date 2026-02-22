import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FarmTierRow {
  subscription_tier: string;
}

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
 * Two-step query:
 * 1. Read the farm's `subscription_tier` slug from the synced farms table
 * 2. Look up that slug in the synced `subscription_tiers` table
 *
 * Returns `null` while loading or if no farm is available.
 */
export function useSubscriptionTier(): SubscriptionTierInfo | null {
  const { farmId } = useActiveFarm();

  // Step 1: Get farm's tier slug
  const farmQuery = farmId
    ? `SELECT subscription_tier FROM farms WHERE id = ?`
    : 'SELECT NULL WHERE 0';

  const { data: farmData } = useQuery<FarmTierRow>(
    farmQuery,
    farmId ? [farmId] : []
  );

  const tierSlug = useMemo(
    () => farmData?.[0]?.subscription_tier ?? null,
    [farmData]
  );

  // Step 2: Look up tier limits (id = slug via sync rules)
  const tierQuery = tierSlug
    ? `SELECT id, display_name, max_admins, max_meter_checkers, max_wells FROM subscription_tiers WHERE id = ?`
    : 'SELECT NULL WHERE 0';

  const { data: tierData } = useQuery<TierRow>(
    tierQuery,
    tierSlug ? [tierSlug] : []
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
