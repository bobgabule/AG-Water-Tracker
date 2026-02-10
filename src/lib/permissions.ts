// ---------------------------------------------------------------------------
// Centralized Permission Matrix
// ---------------------------------------------------------------------------
// Single source of truth for role definitions and permission checks.
// No client code should hardcode role strings -- all checks go through this module.

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = ['super_admin', 'grower', 'admin', 'meter_checker'] as const;
export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const ACTIONS = [
  'manage_farm',
  'manage_users',
  'manage_wells',
  'create_well',
  'record_reading',
  'view_wells',
  'view_members',
  'manage_invites',
  'cross_farm_access',
] as const;
export type Action = (typeof ACTIONS)[number];

// ---------------------------------------------------------------------------
// Permission Matrix
// ---------------------------------------------------------------------------

const ALL_ACTIONS: Set<Action> = new Set(ACTIONS);

const ALL_EXCEPT_CROSS_FARM: Set<Action> = new Set(
  ACTIONS.filter((a) => a !== 'cross_farm_access')
);

export const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  super_admin: ALL_ACTIONS,
  grower: ALL_EXCEPT_CROSS_FARM,
  admin: new Set<Action>([
    'manage_users',
    'manage_wells',
    'create_well',
    'record_reading',
    'view_wells',
    'view_members',
    'manage_invites',
  ]),
  meter_checker: new Set<Action>([
    'record_reading',
    'view_wells',
    'view_members',
  ]),
};

// ---------------------------------------------------------------------------
// Permission Checks
// ---------------------------------------------------------------------------

/**
 * Check if a role has permission to perform an action.
 * Returns false for null/undefined role.
 */
export function hasPermission(
  role: Role | null | undefined,
  action: Action
): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

/**
 * Check if a role is admin-level or above (super_admin, grower, admin).
 * Returns false for meter_checker, null, or undefined.
 */
export function isAdminOrAbove(role: Role | null | undefined): boolean {
  if (!role) return false;
  return role === 'super_admin' || role === 'grower' || role === 'admin';
}

// ---------------------------------------------------------------------------
// Display Names
// ---------------------------------------------------------------------------

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  super_admin: 'Super Admin',
  grower: 'Grower',
  admin: 'Admin',
  meter_checker: 'Meter Checker',
};
