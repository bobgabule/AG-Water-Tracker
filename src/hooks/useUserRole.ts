import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import type { Role } from '../lib/permissions';
import { ROLE_CACHE_KEY } from '../lib/cacheKeys';

interface RoleRow {
  role: string;
}

/** Read cached role from localStorage (returns null on failure). */
function readCachedRole(): Role | null {
  try {
    return (localStorage.getItem(ROLE_CACHE_KEY) as Role) ?? null;
  } catch {
    return null;
  }
}

/**
 * Hook to get the current user's role from the farm_members table.
 * Must be used within PowerSyncProvider.
 *
 * Resolution priority:
 *   1. PowerSync query (authoritative, once synced)
 *   2. JWT app_metadata.user_role (available immediately on login)
 *   3. authStatus.role from get_onboarding_status RPC (available before render)
 *   4. localStorage cache (survives across page reloads before sync)
 *
 * The resolved role is cached in localStorage so that the correct header
 * color (e.g. super_admin maroon) renders instantly on subsequent loads
 * without waiting for PowerSync to sync.
 */
export function useUserRole(): Role | null {
  const { user, authStatus } = useAuth();
  const userId = user?.id ?? null;
  const farmId = authStatus?.farmId ?? null;

  // Guard against empty userId or farmId to avoid unnecessary database queries
  const query =
    userId && farmId
      ? 'SELECT role FROM farm_members WHERE user_id = ? AND farm_id = ?'
      : 'SELECT NULL WHERE 0';

  const { data } = useQuery<RoleRow>(query, userId && farmId ? [userId, farmId] : []);

  // JWT role is available immediately; PowerSync query may lag on first load
  const jwtRole = (user?.app_metadata?.user_role as Role) ?? null;

  // Role from get_onboarding_status RPC — guaranteed available before Header renders
  const authStatusRole = (authStatus?.role as Role) ?? null;

  // Read cached role exactly once on mount (ref survives concurrent-mode re-renders)
  const cachedRoleRef = useRef<Role | null | undefined>(undefined);
  if (cachedRoleRef.current === undefined) {
    cachedRoleRef.current = readCachedRole();
  }

  const role = useMemo(() => {
    if (data && data.length > 0) return data[0].role as Role;
    if (jwtRole) return jwtRole;
    if (authStatusRole) return authStatusRole;
    return cachedRoleRef.current ?? null;
  }, [data, jwtRole, authStatusRole]);

  // Persist whenever the resolved role changes (only while authenticated)
  useEffect(() => {
    if (role && userId) {
      try { localStorage.setItem(ROLE_CACHE_KEY, role); } catch { /* non-critical */ }
    }
  }, [role, userId]);

  return role;
}
