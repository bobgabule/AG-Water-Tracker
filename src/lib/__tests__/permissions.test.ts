import {
  hasPermission,
  PERMISSION_MATRIX,
  ACTIONS,
  type Role,
  type Action,
} from '../permissions';

// ---------------------------------------------------------------------------
// Grower role — permission checks
// ---------------------------------------------------------------------------

describe('Grower permissions', () => {
  const growerActions: Action[] = [
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
  ];

  it.each(growerActions)('grower has "%s" permission', (action) => {
    expect(hasPermission('grower', action)).toBe(true);
  });

  it('grower does NOT have cross_farm_access', () => {
    expect(hasPermission('grower', 'cross_farm_access')).toBe(false);
  });

  it('grower has every action except cross_farm_access', () => {
    const expected = ACTIONS.filter((a) => a !== 'cross_farm_access');
    const actual = ACTIONS.filter((a) => hasPermission('grower', a));
    expect(actual).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Grower vs other roles — comparison
// ---------------------------------------------------------------------------

describe('Grower vs other roles', () => {
  it('grower has manage_farm but admin does not', () => {
    expect(hasPermission('grower', 'manage_farm')).toBe(true);
    expect(hasPermission('admin', 'manage_farm')).toBe(false);
  });

  it('grower has manage_users but meter_checker does not', () => {
    expect(hasPermission('grower', 'manage_users')).toBe(true);
    expect(hasPermission('meter_checker', 'manage_users')).toBe(false);
  });

  it('super_admin has cross_farm_access but grower does not', () => {
    expect(hasPermission('super_admin', 'cross_farm_access')).toBe(true);
    expect(hasPermission('grower', 'cross_farm_access')).toBe(false);
  });

  it('grower and super_admin share all actions except cross_farm_access', () => {
    const growerSet = PERMISSION_MATRIX['grower'];
    const superSet = PERMISSION_MATRIX['super_admin'];
    const diff = [...superSet].filter((a) => !growerSet.has(a));
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

  it('meter_checker can only record/edit/delete readings and view wells', () => {
    const allowed: Action[] = [
      'record_reading',
      'edit_reading',
      'delete_reading',
      'view_wells',
    ];
    const denied = ACTIONS.filter((a) => !allowed.includes(a));

    for (const action of allowed) {
      expect(hasPermission('meter_checker', action)).toBe(true);
    }
    for (const action of denied) {
      expect(hasPermission('meter_checker', action)).toBe(false);
    }
  });
});
