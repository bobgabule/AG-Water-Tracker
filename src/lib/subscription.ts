// ---------------------------------------------------------------------------
// Subscription Types & Helpers
// ---------------------------------------------------------------------------

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
// Seat-Limited Roles
// ---------------------------------------------------------------------------

/** Roles that consume seats (structural — does not vary by tier) */
const SEAT_LIMITED_ROLES = new Set(['admin', 'meter_checker']);

// ---------------------------------------------------------------------------
// Exempt Roles
// ---------------------------------------------------------------------------

/** Roles exempt from seat counting (not limited by plan) */
export const EXEMPT_ROLES = ['owner', 'super_admin'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a role is seat-limited */
export function isSeatLimited(role: string): boolean {
  return SEAT_LIMITED_ROLES.has(role);
}
