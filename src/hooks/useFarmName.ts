import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface FarmRow {
  name: string;
}

/**
 * Hook to get farm name from PowerSync (offline-first).
 * Uses local SQLite database for instant access even when offline.
 */
export function useFarmName(farmId: string | null): string | null {
  // Query farm name from PowerSync local database
  const query = farmId
    ? 'SELECT name FROM farms WHERE id = ? LIMIT 1'
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<FarmRow>(query, farmId ? [farmId] : []);

  // Memoize the result to prevent unnecessary re-renders
  const farmName = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0].name;
  }, [data]);

  return farmName;
}
