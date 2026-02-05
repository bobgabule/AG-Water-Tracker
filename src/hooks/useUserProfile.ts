import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  farm_id: string | null;
  role: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  farm_id: string | null;
  role: string | null;
}

/**
 * Hook to get the current user's profile from PowerSync.
 * Must be used within PowerSyncProvider.
 */
export function useUserProfile(): UserProfile | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Guard against empty userId to avoid unnecessary database queries
  const query = userId
    ? `SELECT id, first_name, last_name, email, phone, farm_id, role
       FROM users WHERE id = ?`
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<UserRow>(query, userId ? [userId] : []);

  return useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0];
  }, [data]);
}
