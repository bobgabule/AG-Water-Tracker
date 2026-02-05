import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';

export interface WellLocation {
  latitude: number;
  longitude: number;
}

export interface WellWithReading {
  id: string;
  name: string;
  status: string;
  location: WellLocation | null;
  meter_id: string | null;
  notes: string | null;
  lastReadingDate: string | null;
}

interface WellRow {
  id: string;
  name: string;
  status: string;
  location: string | null;
  meter_id: string | null;
  notes: string | null;
  last_reading_date: string | null;
}

function parseLocation(raw: string | null): WellLocation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // GeoJSON Point format from ST_AsGeoJSON: {"type":"Point","coordinates":[lng, lat]}
    if (parsed.type === 'Point' && Array.isArray(parsed.coordinates)) {
      const [lng, lat] = parsed.coordinates;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { latitude: lat, longitude: lng };
      }
    }
    // Legacy format: {"lat": number, "lng": number}
    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return { latitude: parsed.lat, longitude: parsed.lng };
    }
  } catch {
    // Try comma-separated format: "lat,lng"
    const parts = raw.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { latitude: parts[0], longitude: parts[1] };
    }
  }
  return null;
}

export function useWells() {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;

  // Guard against empty farmId to avoid unnecessary database queries
  const query = farmId
    ? `SELECT
        w.id, w.name, w.status, w.location, w.meter_id, w.notes,
        (SELECT MAX(r.reading_date) FROM readings r WHERE r.well_id = w.id) as last_reading_date
      FROM wells w
      WHERE w.farm_id = ?
      ORDER BY w.name`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<WellRow>(query, farmId ? [farmId] : []);

  const wells = useMemo<WellWithReading[]>(
    () =>
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status || 'active',
        location: parseLocation(row.location),
        meter_id: row.meter_id,
        notes: row.notes,
        lastReadingDate: row.last_reading_date,
      })),
    [data],
  );

  return { wells, loading: isLoading, error };
}
