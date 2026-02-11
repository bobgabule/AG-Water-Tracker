// ---------------------------------------------------------------------------
// Subscription Plan Constants
// ---------------------------------------------------------------------------
// Hardcoded plan limits for UI-side seat gating (SUBS-03).
// No DB table, no migration, no Stripe -- pure client-side enforcement.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleSeatInfo {
  /** Maximum number of seats for this role */
  limit: number;
  /** Display label (e.g., "Meter Checkers") */
  label: string;
}

export interface PlanLimits {
  /** Plan display name */
  name: string;
  /** Seat limits keyed by role string */
  seats: Record<string, RoleSeatInfo>;
}

// ---------------------------------------------------------------------------
// Default Plan Constants
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: PlanLimits = {
  name: 'Basic',
  seats: {
    admin: { limit: 1, label: 'Admins' },
    meter_checker: { limit: 3, label: 'Meter Checkers' },
  },
};

// ---------------------------------------------------------------------------
// Exempt Roles
// ---------------------------------------------------------------------------

/** Roles exempt from seat counting (not limited by plan) */
export const EXEMPT_ROLES = ['grower', 'super_admin'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a role is seat-limited (has a defined limit in PLAN_LIMITS) */
export function isSeatLimited(role: string): boolean {
  return role in PLAN_LIMITS.seats;
}
