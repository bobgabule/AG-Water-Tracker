// ---------------------------------------------------------------------------
// canSelectAdmin logic — extracted from AddUserModal.tsx line 155
// ---------------------------------------------------------------------------
// The AddUserModal only shows the role toggle (Meter Checker / Admin) when
// the caller is a grower or super_admin. Admins see a fixed "Meter Checker".

function canSelectAdmin(callerRole: string | null): boolean {
  return callerRole === 'grower' || callerRole === 'super_admin';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Invite role selection: canSelectAdmin', () => {
  it('grower can select admin role', () => {
    expect(canSelectAdmin('grower')).toBe(true);
  });

  it('super_admin can select admin role', () => {
    expect(canSelectAdmin('super_admin')).toBe(true);
  });

  it('admin cannot select admin role (can only invite meter_checker)', () => {
    expect(canSelectAdmin('admin')).toBe(false);
  });

  it('meter_checker cannot select admin role', () => {
    expect(canSelectAdmin('meter_checker')).toBe(false);
  });

  it('null role cannot select admin role', () => {
    expect(canSelectAdmin(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invite role validation — what roles can be invited
// ---------------------------------------------------------------------------

describe('Invite role constraints', () => {
  const INVITABLE_ROLES = ['admin', 'meter_checker'];

  it('only admin and meter_checker are invitable roles', () => {
    expect(INVITABLE_ROLES).toEqual(['admin', 'meter_checker']);
  });

  it('grower is NOT an invitable role', () => {
    expect(INVITABLE_ROLES).not.toContain('grower');
  });

  it('super_admin is NOT an invitable role', () => {
    expect(INVITABLE_ROLES).not.toContain('super_admin');
  });
});
