import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useActiveFarm } from './useActiveFarm';

export interface ReportRecipient {
  id: string;
  email: string;
  isAutoAdded: boolean;
  sourceUserId: string | null;
}

interface RecipientRow {
  id: string;
  email: string;
  is_auto_added: number;
  source_user_id: string | null;
}

export function useReportEmailRecipients() {
  const { farmId } = useActiveFarm();

  const query = farmId
    ? `SELECT id, email, is_auto_added, source_user_id
       FROM report_email_recipients WHERE farm_id = ? ORDER BY created_at ASC`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<RecipientRow>(
    query,
    farmId ? [farmId] : [],
  );

  const recipients = useMemo<ReportRecipient[]>(
    () =>
      (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        isAutoAdded: row.is_auto_added === 1,
        sourceUserId: row.source_user_id,
      })),
    [data],
  );

  return { recipients, loading: isLoading, error };
}
