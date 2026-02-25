import { useAuth } from '../lib/AuthProvider';
import { useUserRole } from './useUserRole';
import { useActiveFarmStore } from '../stores/activeFarmStore';

/**
 * Returns the currently active farm (own farm or super_admin override).
 *
 * For super_admin users with an active farm override, returns the override
 * farm. For all other users (or super_admin without override), returns the
 * user's own farm from auth status.
 */
export function useActiveFarm(): {
  farmId: string | null;
  farmName: string | null;
  isOverride: boolean;
} {
  const { authStatus } = useAuth();
  const role = useUserRole();
  const overrideFarmId = useActiveFarmStore((s) => s.overrideFarmId);
  const overrideFarmName = useActiveFarmStore((s) => s.overrideFarmName);

  if (role === 'super_admin' && overrideFarmId) {
    return { farmId: overrideFarmId, farmName: overrideFarmName, isOverride: true };
  }

  return {
    farmId: authStatus?.farmId ?? null,
    farmName: authStatus?.farmName ?? null,
    isOverride: false,
  };
}
