import { useState, useEffect } from 'react';
import { useActiveFarm } from './useActiveFarm';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionTierInfo {
  /** Tier slug, e.g. 'starter' or 'pro' */
  slug: string;
  /** Human-readable name, e.g. 'Starter Plan' */
  displayName: string;
  /** Max admin seats for this tier */
  maxAdmins: number;
  /** Max meter reader seats for this tier */
  maxMeterReaders: number;
  /** Max wells allowed (base tier + add-ons) */
  maxWells: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current farm's subscription tier limits from Supabase.
 *
 * Uses PostgREST embedded join: farms → subscription_tiers (via FK on
 * farms.subscription_tier → subscription_tiers.slug).
 *
 * Returns `null` while loading or if no farm is available.
 */
export function useSubscriptionTier(): SubscriptionTierInfo | null {
  const { farmId } = useActiveFarm();
  const [tier, setTier] = useState<SubscriptionTierInfo | null>(null);

  useEffect(() => {
    if (!farmId) {
      setTier(null);
      return;
    }

    let cancelled = false;

    supabase
      .from('farms')
      .select('subscription_tier, extra_wells, subscription_tiers(display_name, max_admins, max_meter_checkers, max_wells)')
      .eq('id', farmId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setTier(null);
          return;
        }

        // PostgREST returns the embedded resource as an object for single() FK joins
        const raw = data.subscription_tiers as unknown;
        const st = (Array.isArray(raw) ? raw[0] : raw) as
          | { display_name: string; max_admins: number; max_meter_checkers: number; max_wells: number }
          | undefined;
        if (!st) {
          setTier(null);
          return;
        }

        setTier({
          slug: data.subscription_tier as string,
          displayName: st.display_name,
          maxAdmins: st.max_admins,
          maxMeterReaders: st.max_meter_checkers,
          maxWells: st.max_wells + ((data.extra_wells ?? 0) as number),
        });
      });

    return () => { cancelled = true; };
  }, [farmId]);

  return tier;
}
