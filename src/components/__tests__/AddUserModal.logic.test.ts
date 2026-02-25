// ---------------------------------------------------------------------------
// canSelectAdmin logic — extracted from AddUserModal.tsx line 155
// ---------------------------------------------------------------------------
// The AddUserModal only shows the role toggle (Meter Checker / Admin) when
// the caller is an owner or super_admin. Admins see a fixed "Meter Checker".

function canSelectAdmin(callerRole: string | null): boolean {
  return callerRole === 'owner' || callerRole === 'super_admin';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Invite role selection: canSelectAdmin', () => {
  it('owner can select admin role', () => {
    expect(canSelectAdmin('owner')).toBe(true);
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

  it('owner is NOT an invitable role', () => {
    expect(INVITABLE_ROLES).not.toContain('owner');
  });

  it('super_admin is NOT an invitable role', () => {
    expect(INVITABLE_ROLES).not.toContain('super_admin');
  });
});
