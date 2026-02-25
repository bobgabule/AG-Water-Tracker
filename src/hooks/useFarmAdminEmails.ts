import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';

interface EmailRow {
  user_id: string;
  email: string;
  role: string;
}

export interface FarmAdminEmail {
  userId: string;
  email: string;
  role: string;
}

export function useFarmAdminEmails() {
  const { farmId } = useActiveFarm();

  const query = farmId
    ? `SELECT fm.user_id, u.email, fm.role
       FROM farm_members fm
       JOIN users u ON u.id = fm.user_id
       WHERE fm.farm_id = ?
         AND fm.role IN ('owner', 'admin', 'super_admin')
         AND u.email IS NOT NULL
         AND u.email != ''
       ORDER BY fm.created_at ASC`
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<EmailRow>(query, farmId ? [farmId] : []);

  return useMemo<FarmAdminEmail[]>(
    () =>
      (data ?? []).map((row) => ({
        userId: row.user_id,
        email: row.email,
        role: row.role,
      })),
    [data],
  );
}
