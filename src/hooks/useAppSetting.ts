import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Returns a single app setting value by key from Supabase.
 * Returns `defaultValue` (default: null) when the key is not found or while loading.
 *
 * The app_settings table uses `key` as PK in Supabase.
 */
export function useAppSetting(key: string, defaultValue: string | null = null): string | null {
  const [value, setValue] = useState<string | null>(defaultValue);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setValue(defaultValue);
          return;
        }
        setValue((data as { value: string }).value);
      });

    return () => { cancelled = true; };
  }, [key, defaultValue]);

  return value;
}
