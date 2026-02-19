import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import type { ReadingRow } from '../lib/powersync-schema';

export interface Reading {
  id: string;
  wellId: string;
  farmId: string;
  value: string;
  recordedBy: string;
  recordedAt: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  isInRange: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useWellReadings(wellId: string | null) {
  const query = wellId
    ? `SELECT id, well_id, farm_id, value, recorded_by, recorded_at,
       gps_latitude, gps_longitude, is_in_range, notes, created_at, updated_at
       FROM readings WHERE well_id = ? ORDER BY recorded_at DESC`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<ReadingRow>(
    query,
    wellId ? [wellId] : [],
  );

  const readings = useMemo<Reading[]>(
    () =>
      (data ?? []).map((row) => ({
        id: row.id,
        wellId: row.well_id ?? '',
        farmId: row.farm_id ?? '',
        value: row.value ?? '',
        recordedBy: row.recorded_by ?? '',
        recordedAt: row.recorded_at ?? '',
        gpsLatitude: row.gps_latitude,
        gpsLongitude: row.gps_longitude,
        isInRange: row.is_in_range === 1,
        notes: row.notes,
        createdAt: row.created_at ?? '',
        updatedAt: row.updated_at ?? '',
      })),
    [data],
  );

  return { readings, loading: isLoading, error };
}
