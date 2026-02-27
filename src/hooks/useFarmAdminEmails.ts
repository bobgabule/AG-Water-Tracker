import { useState, useEffect } from 'react';
import { useActiveFarm } from './useActiveFarm';
import { supabase } from '../lib/supabase';

export interface FarmAdminEmail {
  userId: string;
  email: string;
  role: string;
}

export function useFarmAdminEmails() {
  const { farmId } = useActiveFarm();
  const [adminEmails, setAdminEmails] = useState<FarmAdminEmail[]>([]);

  useEffect(() => {
    if (!farmId) return;

    supabase
      .rpc('get_farm_admin_emails', { p_farm_id: farmId })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to fetch admin emails:', error);
          return;
        }
        if (data) {
          setAdminEmails(
            data.map((row: { user_id: string; email: string; role: string }) => ({
              userId: row.user_id,
              email: row.email,
              role: row.role,
            })),
          );
        }
      });
  }, [farmId]);

  return adminEmails;
}
