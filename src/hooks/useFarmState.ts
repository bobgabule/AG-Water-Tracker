import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface FarmStateRow {
  state: string | null;
}

/**
 * Hook to get farm US state abbreviation from PowerSync (offline-first).
 * Returns the 2-letter state code (e.g., "KS", "TX") or null.
 */
export function useFarmState(farmId: string | null): string | null {
  const query = farmId
    ? 'SELECT state FROM farms WHERE id = ? LIMIT 1'
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<FarmStateRow>(query, farmId ? [farmId] : []);

  const farmState = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0].state || null;
  }, [data]);

  return farmState;
}
