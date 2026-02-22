import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';

interface CountRow {
  count: number;
}

/**
 * Returns the number of wells belonging to the current user's farm.
 *
 * Counts ALL non-deleted wells (no status filter) because wells are hard-deleted,
 * so every row in the wells table is a live well.
 */
export function useWellCount(): number {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;

  const query = farmId
    ? 'SELECT COUNT(*) as count FROM wells WHERE farm_id = ?'
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<CountRow>(query, farmId ? [farmId] : []);

  return useMemo(() => data?.[0]?.count ?? 0, [data]);
}
