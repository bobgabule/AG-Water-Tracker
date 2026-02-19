import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface CurrentAllocationRow {
  well_id: string;
  allocated_af: string;
  used_af: string;
}

export interface WellAllocationSummary {
  allocatedAf: number;
  usedAf: number;
  usagePercent: number;
}

export function useCurrentAllocations(farmId: string | null) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const query = farmId
    ? `SELECT well_id, allocated_af, used_af
       FROM allocations
       WHERE farm_id = ? AND period_start <= ? AND period_end >= ?
       ORDER BY period_start DESC`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading } = useQuery<CurrentAllocationRow>(
    query,
    farmId ? [farmId, today, today] : [],
  );

  const allocationsByWellId = useMemo(() => {
    const map = new Map<string, WellAllocationSummary>();
    for (const row of data ?? []) {
      if (map.has(row.well_id)) continue; // first row wins (most recent period)
      const allocated = parseFloat(row.allocated_af) || 0;
      const used = parseFloat(row.used_af) || 0;
      const usagePercent = allocated > 0
        ? Math.min((used / allocated) * 100, 100)
        : 0;
      map.set(row.well_id, { allocatedAf: allocated, usedAf: used, usagePercent });
    }
    return map;
  }, [data]);

  return { allocationsByWellId, loading: isLoading };
}
