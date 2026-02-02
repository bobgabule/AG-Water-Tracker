import { useQuery } from '@powersync/react';

interface FarmRow {
  name: string;
}

export function useFarmName(farmId: string | null): string | null {
  const { data } = useQuery<FarmRow>(
    farmId ? 'SELECT name FROM farms WHERE id = ?' : 'SELECT NULL AS name WHERE 0',
    farmId ? [farmId] : [],
  );

  return data?.[0]?.name ?? null;
}
