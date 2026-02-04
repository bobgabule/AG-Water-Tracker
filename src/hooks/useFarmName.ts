import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useFarmName(farmId: string | null): string | null {
  const [farmName, setFarmName] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) {
      setFarmName(null);
      return;
    }

    let cancelled = false;

    async function fetchFarmName() {
      const { data, error } = await supabase
        .from('farms')
        .select('name')
        .eq('id', farmId)
        .single();

      if (!cancelled && !error && data) {
        setFarmName(data.name);
      }
    }

    fetchFarmName();

    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return farmName;
}
