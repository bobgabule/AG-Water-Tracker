import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

export interface ReadingWithName {
  id: string;
  wellId: string;
  value: string;
  recordedBy: string;
  recordedAt: string;
  recorderName: string;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  isInRange: boolean;
  isSimilarReading: boolean;
  notes: string | null;
}

interface ReadingWithNameRow {
  id: string;
  well_id: string | null;
  value: string | null;
  recorded_by: string | null;
  recorded_at: string | null;
  recorder_name: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  is_in_range: number | null;
  is_similar_reading: number | null;
  notes: string | null;
}

export function useWellReadingsWithNames(wellId: string | null) {
  const query = wellId
    ? `SELECT r.id, r.well_id, r.value, r.recorded_by, r.recorded_at,
         r.gps_latitude, r.gps_longitude, r.is_in_range, r.is_similar_reading, r.notes,
         COALESCE(fm.full_name, 'Unknown') as recorder_name
       FROM readings r
       LEFT JOIN farm_members fm ON fm.user_id = r.recorded_by
       WHERE r.well_id = ?
       ORDER BY r.recorded_at DESC`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<ReadingWithNameRow>(
    query,
    wellId ? [wellId] : [],
  );

  const readings = useMemo<ReadingWithName[]>(
    () =>
      (data ?? []).map((row) => ({
        id: row.id,
        wellId: row.well_id ?? '',
        value: row.value ?? '',
        recordedBy: row.recorded_by ?? '',
        recordedAt: row.recorded_at ?? '',
        recorderName: row.recorder_name ?? 'Unknown',
        gpsLatitude: row.gps_latitude,
        gpsLongitude: row.gps_longitude,
        isInRange: row.is_in_range === 1,
        isSimilarReading: row.is_similar_reading === 1,
        notes: row.notes,
      })),
    [data],
  );

  return { readings, loading: isLoading, error };
}
