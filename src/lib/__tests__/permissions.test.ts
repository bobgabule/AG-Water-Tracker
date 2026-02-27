import {
  hasPermission,
  PERMISSION_MATRIX,
  ACTIONS,
  type Role,
  type Action,
} from '../permissions';

// ---------------------------------------------------------------------------
// Owner role — permission checks
// ---------------------------------------------------------------------------

describe('Owner permissions', () => {
  const ownerActions: Action[] = [
    'create_well',
    'edit_well',
    'delete_well',
    'manage_allocations',
    'record_reading',
    'delete_reading',
    'view_wells',
    'manage_users',
    'manage_farm',
    'manage_invites',
    'manage_reports',
  ];

  it.each(ownerActions)('owner has "%s" permission', (action) => {
    expect(hasPermission('owner', action)).toBe(true);
  });

  it('owner does NOT have cross_farm_access', () => {
    expect(hasPermission('owner', 'cross_farm_access')).toBe(false);
  });

  it('owner has every action except cross_farm_access', () => {
    const expected = ACTIONS.filter((a) => a !== 'cross_farm_access');
    const actual = ACTIONS.filter((a) => hasPermission('owner', a));
    expect(actual).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Owner vs other roles — comparison
// ---------------------------------------------------------------------------

describe('Owner vs other roles', () => {
  it('owner has manage_farm but admin does not', () => {
    expect(hasPermission('owner', 'manage_farm')).toBe(true);
    expect(hasPermission('admin', 'manage_farm')).toBe(false);
  });

  it('owner has manage_users but meter_checker does not', () => {
    expect(hasPermission('owner', 'manage_users')).toBe(true);
    expect(hasPermission('meter_checker', 'manage_users')).toBe(false);
  });

  it('super_admin has cross_farm_access but owner does not', () => {
    expect(hasPermission('super_admin', 'cross_farm_access')).toBe(true);
    expect(hasPermission('owner', 'cross_farm_access')).toBe(false);
  });

  it('owner and super_admin share all actions except cross_farm_access', () => {
    const ownerSet = PERMISSION_MATRIX['owner'];
    const superSet = PERMISSION_MATRIX['super_admin'];
    const diff = [...superSet].filter((a) => !ownerSet.has(a));
    expect(diff).toEqual(['cross_farm_access']);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('hasPermission edge cases', () => {
  it('returns false for null role', () => {
    expect(hasPermission(null, 'manage_users')).toBe(false);
  });

  it('returns false for undefined role', () => {
    expect(hasPermission(undefined, 'manage_users')).toBe(false);
  });

  it('returns false for unknown role', () => {
    expect(hasPermission('unknown' as Role, 'manage_users')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full matrix snapshot — ensures nobody accidentally modifies the matrix
// ---------------------------------------------------------------------------

describe('Permission matrix integrity', () => {
  it('admin cannot manage_farm', () => {
    expect(hasPermission('admin', 'manage_farm')).toBe(false);
  });

  it('meter_checker can only record readings and view wells', () => {
    const allowed: Action[] = [
      'record_reading',
      'view_wells',
    ];
    const denied = ACTIONS.filter((a) => !allowed.includes(a));

    expect(PERMISSION_MATRIX['meter_checker'].size).toBe(2);
    for (const action of allowed) {
      expect(hasPermission('meter_checker', action)).toBe(true);
    }
    for (const action of denied) {
      expect(hasPermission('meter_checker', action)).toBe(false);
    }
  });

  it('meter_checker cannot delete readings', () => {
    expect(hasPermission('meter_checker', 'delete_reading')).toBe(false);
  });
});
