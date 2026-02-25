import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface LatestSimilarRow {
  well_id: string;
  is_similar: number;
}

/**
 * Returns a Set of well IDs whose latest reading was flagged as similar
 * to the prior reading (is_similar_reading = 1).
 */
export function useWellSimilarFlags(farmId: string | null) {
  const query = farmId
    ? `SELECT r.well_id, r.is_similar_reading AS is_similar
       FROM readings r
       INNER JOIN (
         SELECT well_id, MAX(recorded_at) AS max_at
         FROM readings
         WHERE farm_id = ?
         GROUP BY well_id
       ) latest ON r.well_id = latest.well_id AND r.recorded_at = latest.max_at`
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<LatestSimilarRow>(
    query,
    farmId ? [farmId] : [],
  );

  const similarWellIds = useMemo(() => {
    const set = new Set<string>();
    for (const row of data ?? []) {
      if (row.is_similar === 1) {
        set.add(row.well_id);
      }
    }
    return set;
  }, [data]);

  return similarWellIds;
}
