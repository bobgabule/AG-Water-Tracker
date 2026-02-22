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
  'create_well',
  'edit_well',
  'delete_well',
  'manage_allocations',
  'record_reading',
  'edit_reading',
  'delete_reading',
  'view_wells',
  'manage_users',
  'manage_farm',
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
    'create_well',
    'edit_well',
    'delete_well',
    'manage_allocations',
    'record_reading',
    'edit_reading',
    'delete_reading',
    'view_wells',
    'manage_users',
    'manage_invites',
  ]),
  meter_checker: new Set<Action>([
    'record_reading',
    'edit_reading',
    'delete_reading',
    'view_wells',
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

// ---------------------------------------------------------------------------
// Display Names
// ---------------------------------------------------------------------------

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  super_admin: 'Super Admin',
  grower: 'Grower',
  admin: 'Admin',
  meter_checker: 'Meter Checker',
};

// ---------------------------------------------------------------------------
// Role Badge Styles (Tailwind classes for colored role pills)
// ---------------------------------------------------------------------------

export const ROLE_BADGE_STYLES: Record<Role, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  grower: 'bg-green-100 text-green-700',
  admin: 'bg-yellow-100 text-yellow-700',
  meter_checker: 'bg-blue-100 text-blue-700',
};
