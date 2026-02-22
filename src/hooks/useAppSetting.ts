import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface AppSettingRow {
  id: string;   // key mapped to id via sync rules (SELECT key AS id)
  value: string;
}

/**
 * Returns a single app setting value by key.
 * Returns `defaultValue` (default: null) when the key is not found or not yet synced.
 *
 * The app_settings table uses `key` as PK in Supabase, mapped to `id` in PowerSync
 * via sync rules (SELECT key AS id). Always query by `id` column client-side.
 */
export function useAppSetting(key: string, defaultValue: string | null = null): string | null {
  const { data } = useQuery<AppSettingRow>(
    `SELECT id, value FROM app_settings WHERE id = ?`,
    [key]
  );

  return useMemo(
    () => (data.length > 0 ? data[0].value : defaultValue),
    [data, defaultValue]
  );
}
