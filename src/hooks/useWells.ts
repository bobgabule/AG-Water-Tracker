import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';

export interface WellLocation {
  latitude: number;
  longitude: number;
}

export interface WellWithReading {
  id: string;
  name: string;
  status: string;
  location: WellLocation | null;
  meterSerialNumber: string | null;
  wmisNumber: string | null;
  units: string;
  multiplier: string;
  batteryState: string;
  pumpState: string;
  meterStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface WellRow {
  id: string;
  name: string;
  status: string;
  latitude: number;
  longitude: number;
  meter_serial_number: string | null;
  wmis_number: string | null;
  units: string;
  multiplier: string;
  battery_state: string;
  pump_state: string;
  meter_status: string;
  created_at: string;
  updated_at: string;
}

export function useWells() {
  const { farmId } = useActiveFarm();

  // Guard against empty farmId to avoid unnecessary database queries
  const query = farmId
    ? `SELECT id, name, status, latitude, longitude, meter_serial_number,
       wmis_number, units, multiplier, battery_state,
       pump_state, meter_status, created_at, updated_at
       FROM wells WHERE farm_id = ? ORDER BY name`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<WellRow>(query, farmId ? [farmId] : []);

  const wells = useMemo<WellWithReading[]>(
    () =>
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status || 'active',
        location:
          row.latitude != null && row.longitude != null
            ? { latitude: row.latitude, longitude: row.longitude }
            : null,
        meterSerialNumber: row.meter_serial_number,
        wmisNumber: row.wmis_number,
        units: row.units,
        multiplier: row.multiplier,
        batteryState: row.battery_state,
        pumpState: row.pump_state,
        meterStatus: row.meter_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    [data],
  );

  return { wells, loading: isLoading, error };
}
