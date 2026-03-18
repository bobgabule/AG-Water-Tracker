import { useState, useEffect, useCallback } from 'react';
import { useActiveFarm } from './useActiveFarm';
import { supabase } from '../lib/supabase';

export interface ReportRecipient {
  id: string;
  email: string;
  isAutoAdded: boolean;
  sourceUserId: string | null;
}

interface RecipientRow {
  id: string;
  email: string;
  is_auto_added: boolean;
  source_user_id: string | null;
}

export function useReportEmailRecipients() {
  const { farmId } = useActiveFarm();
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!farmId) {
      setRecipients([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('report_email_recipients')
      .select('id, email, is_auto_added, source_user_id')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(new Error(fetchError.message));
          setLoading(false);
          return;
        }

        setRecipients(
          ((data as RecipientRow[]) ?? []).map((row) => ({
            id: row.id,
            email: row.email,
            isAutoAdded: Boolean(row.is_auto_added),
            sourceUserId: row.source_user_id,
          })),
        );
        setError(null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [farmId, refreshKey]);

  return { recipients, loading, error, refetch };
}
