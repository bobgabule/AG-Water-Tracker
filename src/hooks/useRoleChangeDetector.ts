import { useEffect, useRef } from 'react';
import { useUserRole } from './useUserRole';
import { disconnectAndClear } from '../lib/powersync';
import { debugLog } from '../lib/debugLog';
import type { Role } from '../lib/permissions';

/**
 * Detects server-side role changes and forces a full data refresh.
 *
 * The hook watches the role returned by useUserRole (sourced from
 * farm_members via PowerSync) and triggers disconnectAndClear +
 * page reload when an actual role transition is detected.
 *
 * Transition rules:
 *   undefined -> role  = first render, store initial value (skip)
 *   null -> role       = initial data load (skip)
 *   role -> null       = sign-out or data clearing (skip)
 *   role A -> role A   = no change (skip)
 *   role A -> role B   = actual role change (trigger!)
 *
 * Must be called inside PowerSyncProvider scope (uses useUserRole).
 */
export function useRoleChangeDetector(): void {
  const role = useUserRole();
  const prevRoleRef = useRef<Role | null | undefined>(undefined);

  useEffect(() => {
    // First render: store initial value, do nothing
    if (prevRoleRef.current === undefined) {
      prevRoleRef.current = role;
      return;
    }

    // Only trigger on known-role to different-known-role transitions
    if (
      prevRoleRef.current !== null &&
      role !== null &&
      prevRoleRef.current !== role
    ) {
      debugLog(
        'RoleChangeDetector',
        `Role changed from ${prevRoleRef.current} to ${role}, clearing local data`
      );

      disconnectAndClear().then(() => {
        window.location.reload();
      });
    }

    prevRoleRef.current = role;
  }, [role]);
}
