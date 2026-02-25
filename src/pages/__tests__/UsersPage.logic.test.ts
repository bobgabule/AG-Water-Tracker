import { hasPermission, type Role } from '../../lib/permissions';

// ---------------------------------------------------------------------------
// canDeleteMember logic — extracted from UsersPage.tsx lines 103-119
// ---------------------------------------------------------------------------
// This mirrors the inline callback to verify the role hierarchy is correct.

interface FarmMemberRow {
  id: string;
  user_id: string;
  role: string;
  full_name: string | null;
  created_at: string;
}

function canDeleteMember(
  userRole: Role | null,
  currentUserId: string,
  member: FarmMemberRow
): boolean {
  const canManageUsers = hasPermission(userRole, 'manage_users');
  if (!canManageUsers) return false;
  if (member.user_id === currentUserId) return false;
  if (userRole === 'super_admin') return true;
  if (userRole === 'owner') {
    return member.role === 'admin' || member.role === 'meter_checker';
  }
  if (userRole === 'admin') return member.role === 'meter_checker';
  return false;
}

// Helpers to create test members
const ME = 'user-owner-001';
function member(role: string, userId = 'user-other'): FarmMemberRow {
  return { id: `m-${role}`, user_id: userId, role, full_name: role, created_at: '' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Owner: canDeleteMember', () => {
  it('can delete an admin', () => {
    expect(canDeleteMember('owner', ME, member('admin'))).toBe(true);
  });

  it('can delete a meter_checker', () => {
    expect(canDeleteMember('owner', ME, member('meter_checker'))).toBe(true);
  });

  it('cannot delete another owner', () => {
    expect(canDeleteMember('owner', ME, member('owner'))).toBe(false);
  });

  it('cannot delete a super_admin', () => {
    expect(canDeleteMember('owner', ME, member('super_admin'))).toBe(false);
  });

  it('cannot delete themselves', () => {
    expect(canDeleteMember('owner', ME, member('owner', ME))).toBe(false);
  });
});

describe('Super admin: canDeleteMember', () => {
  it('can delete an owner', () => {
    expect(canDeleteMember('super_admin', ME, member('owner'))).toBe(true);
  });

  it('can delete an admin', () => {
    expect(canDeleteMember('super_admin', ME, member('admin'))).toBe(true);
  });

  it('can delete a meter_checker', () => {
    expect(canDeleteMember('super_admin', ME, member('meter_checker'))).toBe(true);
  });

  it('can delete another super_admin', () => {
    expect(canDeleteMember('super_admin', ME, member('super_admin'))).toBe(true);
  });

  it('cannot delete themselves', () => {
    expect(canDeleteMember('super_admin', ME, member('super_admin', ME))).toBe(false);
  });
});

describe('Admin: canDeleteMember', () => {
  it('can delete a meter_checker', () => {
    expect(canDeleteMember('admin', ME, member('meter_checker'))).toBe(true);
  });

  it('cannot delete another admin', () => {
    expect(canDeleteMember('admin', ME, member('admin'))).toBe(false);
  });

  it('cannot delete an owner', () => {
    expect(canDeleteMember('admin', ME, member('owner'))).toBe(false);
  });
});

describe('Meter checker: canDeleteMember', () => {
  it('cannot delete anyone (no manage_users permission)', () => {
    expect(canDeleteMember('meter_checker', ME, member('meter_checker'))).toBe(false);
    expect(canDeleteMember('meter_checker', ME, member('admin'))).toBe(false);
  });
});

describe('Null role: canDeleteMember', () => {
  it('cannot delete anyone', () => {
    expect(canDeleteMember(null, ME, member('meter_checker'))).toBe(false);
  });
});
