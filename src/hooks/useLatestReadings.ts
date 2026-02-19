import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface LatestReadingRow {
  well_id: string;
  latest_recorded_at: string;
}

export function useLatestReadings(farmId: string | null) {
  const query = farmId
    ? `SELECT well_id, MAX(recorded_at) as latest_recorded_at
       FROM readings
       WHERE farm_id = ?
       GROUP BY well_id`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading } = useQuery<LatestReadingRow>(
    query,
    farmId ? [farmId] : [],
  );

  const latestByWellId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data ?? []) {
      if (row.well_id && row.latest_recorded_at) {
        map.set(row.well_id, row.latest_recorded_at);
      }
    }
    return map;
  }, [data]);

  return { latestByWellId, loading: isLoading };
}
