import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';

export interface FarmReadOnlyState {
  /** True when subscription is canceled AND paid period has ended */
  isReadOnly: boolean;
  /** The date when farm data will be permanently deleted (current_period_end + 1 year), or null */
  deletionDate: string | null;
  /** Whether the data has loaded (false while loading) */
  loaded: boolean;
}

export function useFarmReadOnly(): FarmReadOnlyState {
  const { farmId } = useActiveFarm();

  const sql = farmId
    ? `SELECT subscription_status, current_period_end FROM farms WHERE id = ?`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading } = useQuery<{ subscription_status: string | null; current_period_end: string | null }>(
    sql,
    farmId ? [farmId] : []
  );

  return useMemo(() => {
    if (isLoading || !data || data.length === 0) {
      return { isReadOnly: true, deletionDate: null, loaded: !isLoading };
    }

    const row = data[0];
    const status = row.subscription_status;
    const periodEnd = row.current_period_end;

    if (status !== 'canceled' || !periodEnd) {
      return { isReadOnly: false, deletionDate: null, loaded: true };
    }

    const periodEndDate = new Date(periodEnd);
    const now = new Date();

    // Read-only only kicks in AFTER the paid period has ended
    const isReadOnly = periodEndDate < now;

    // Deletion date = current_period_end + 1 year (computed client-side per CONTEXT)
    let deletionDate: string | null = null;
    if (isReadOnly) {
      const deleteAt = new Date(periodEndDate);
      deleteAt.setFullYear(deleteAt.getFullYear() + 1);
      deletionDate = deleteAt.toISOString();
    }

    return { isReadOnly, deletionDate, loaded: true };
  }, [data, isLoading]);
}
