import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import type { AllocationRow } from '../lib/powersync-schema';

export interface Allocation {
  id: string;
  wellId: string;
  farmId: string;
  periodStart: string;
  periodEnd: string;
  allocatedAf: string;
  usedAf: string;
  isManualOverride: boolean;
  startingReading: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useWellAllocations(wellId: string | null) {
  const query = wellId
    ? `SELECT id, well_id, farm_id, period_start, period_end, allocated_af,
       used_af, is_manual_override, starting_reading, notes, created_at, updated_at
       FROM allocations WHERE well_id = ? ORDER BY period_start DESC`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<AllocationRow>(
    query,
    wellId ? [wellId] : [],
  );

  const allocations = useMemo<Allocation[]>(
    () =>
      (data ?? []).map((row) => ({
        id: row.id,
        wellId: row.well_id ?? '',
        farmId: row.farm_id ?? '',
        periodStart: row.period_start ?? '',
        periodEnd: row.period_end ?? '',
        allocatedAf: row.allocated_af ?? '',
        usedAf: row.used_af ?? '',
        isManualOverride: row.is_manual_override === 1,
        startingReading: row.starting_reading ?? '',
        notes: row.notes,
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? '',
      })),
    [data],
  );

  return { allocations, loading: isLoading, error };
}
