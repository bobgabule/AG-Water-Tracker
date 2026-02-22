---
phase: 22-farm-data-isolation-audit
verified: 2026-02-22T21:15:00Z
status: passed
score: 7/7 must-haves verified
requirements_coverage:
  - id: ISO-01
    status: satisfied
    evidence: "RLS policies on wells, readings, allocations, farm_members all use get_user_farm_ids() for farm_id filtering"
  - id: ISO-02
    status: satisfied
    evidence: "All 7 farm-scoped sync rule buckets parameterize by farm_id from farm_members WHERE user_id = request.user_id()"
  - id: ISO-03
    status: satisfied
    evidence: "Super admin auto-membership triggers (migration 025) create farm_members rows in ALL farms, ensuring consistent cross-farm access"
---

# Phase 22: Farm Data Isolation Audit Verification Report

**Phase Goal:** Every database query and sync rule correctly isolates farm data, with verified super_admin cross-farm access

**Verified:** 2026-02-22T21:15:00Z

**Status:** PASSED

**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Stale legacy invite_code fallback in join_farm_with_code_impl is removed | ✓ VERIFIED | Migration 035 line 49: "No fallback -- farm_invites is the only invite system" — no reference to farms.invite_code in function body |
| 2 | super_admin_user_id setting exists in app_settings table | ✓ VERIFIED | Migration 035 lines 83-85: INSERT into app_settings with key 'super_admin_user_id' and empty value |
| 3 | All RPC functions use fully qualified public.* references | ✓ VERIFIED | Migration 035 join_farm_with_code_impl uses public.farm_invites, public.farm_members throughout (lines 46, 62, 66, 69) |
| 4 | All hooks and pages query by the active farm (own or super_admin override), not hardcoded auth farm | ✓ VERIFIED | 13 files modified: 4 hooks + 8 pages + 2 components all use useActiveFarm().farmId instead of authStatus?.farmId |
| 5 | Super admin farm selection persists across page reloads via Zustand persist | ✓ VERIFIED | activeFarmStore.ts lines 11-24: persist middleware with localStorage key 'ag-active-farm' |
| 6 | Header background is maroon (#800000) when user is super_admin | ✓ VERIFIED | Header.tsx line 14: `const headerBg = role === 'super_admin' ? 'bg-[#800000]' : 'bg-[#5f7248]'` |
| 7 | useUserRole.ts and FarmSelector.tsx are NOT modified (circular dependency and ownFarmId respectively) | ✓ VERIFIED | Grep confirms only 3 files use authStatus?.farmId: useActiveFarm.ts (source), useUserRole.ts, FarmSelector.tsx |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/035_isolation_audit_fixes.sql` | Stale RPC cleanup and super_admin_user_id app setting | ✓ VERIFIED | Exists, contains super_admin_user_id insert, no farms.invite_code references in function |
| `.planning/phases/22-farm-data-isolation-audit/22-AUDIT-REPORT.md` | Comprehensive isolation audit report with PASS/FAIL verdicts | ✓ VERIFIED | Exists, contains ISO-01/ISO-02/ISO-03 requirement verification, 8 layers audited |
| `src/hooks/useWells.ts` | Well queries filtered by active farm | ✓ VERIFIED | Line 46: `const { farmId } = useActiveFarm()` — imports and uses useActiveFarm |
| `src/hooks/useWellCount.ts` | Well count filtered by active farm | ✓ VERIFIED | Contains useActiveFarm import and usage |
| `src/hooks/useSubscriptionTier.ts` | Tier lookup by active farm | ✓ VERIFIED | Contains useActiveFarm import and usage |
| `src/hooks/useSeatUsage.ts` | Seat usage by active farm | ✓ VERIFIED | Contains useActiveFarm import and usage |
| `src/pages/DashboardPage.tsx` | Dashboard uses active farm | ✓ VERIFIED | Contains useActiveFarm import and usage |
| `src/pages/UsersPage.tsx` | Users page uses active farm | ✓ VERIFIED | Contains useActiveFarm import and usage |
| `src/stores/activeFarmStore.ts` | Persisted farm override state | ✓ VERIFIED | Lines 2, 12: imports persist from zustand/middleware and wraps state with persist() |
| `src/components/Header.tsx` | Maroon header for super_admin | ✓ VERIFIED | Line 17: `className={headerBg}` where headerBg = 'bg-[#800000]' when role === 'super_admin' |

**All 10 artifacts verified.**

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `private.join_farm_with_code_impl` | `public.farm_invites` | code lookup only (no legacy farms.invite_code fallback) | ✓ WIRED | Migration 035 lines 46-52: SELECT from farm_invites, raises 'Invalid invite code' if NULL, no fallback path |
| `src/hooks/useWells.ts` | `src/hooks/useActiveFarm.ts` | useActiveFarm().farmId replaces authStatus?.farmId | ✓ WIRED | Line 3: imports useActiveFarm, line 46: destructures farmId from useActiveFarm() |
| `src/stores/activeFarmStore.ts` | `localStorage` | Zustand persist middleware | ✓ WIRED | Lines 12-24: persist wrapper with name: 'ag-active-farm' stores state in localStorage |
| `src/components/Header.tsx` | `src/hooks/useUserRole.ts` | role-based header color | ✓ WIRED | Line 2: imports useUserRole, line 12: `const role = useUserRole()`, line 14: conditionally sets bg based on role |

**All 4 key links verified as WIRED.**

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ISO-01 | 22-01, 22-02 | Verify RLS policies filter wells, readings, allocations, members by farm_id | ✓ SATISFIED | All core data tables use `get_user_farm_ids()` or `get_user_admin_farm_ids()` in RLS policies. Wells: migration 017 line 86, migration 032 lines 37, 41. Readings: migration 031 all 4 operations. Allocations: migration 031 all 4 operations. farm_members: migration 011 lines 68, 73 (SELECT only, INSERT/UPDATE/DELETE via RPCs). |
| ISO-02 | 22-01, 22-02 | Verify PowerSync sync rules filter all data tables by farm_id | ✓ SATISFIED | All 7 farm-scoped sync rule buckets in docs/powersync-sync-rules.yaml use `parameters: SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` with data filter `WHERE farm_id = bucket.farm_id`. Global buckets (subscription_tiers, app_settings) contain no farm-specific data. |
| ISO-03 | 22-01, 22-02 | Verify super_admin cross-farm bypass is consistent across all tables and sync rules | ✓ SATISFIED | Migration 025 auto-add triggers create farm_members rows for super_admin in ALL farms (3 triggers: add_super_admins_to_new_farm, add_super_admin_to_all_farms, add_super_admin_to_all_farms_on_insert). This means get_user_farm_ids() naturally returns all farm IDs for super_admin, providing consistent cross-farm access in both RLS policies and PowerSync sync rules. Client-side: 13 files now use useActiveFarm() to respect super_admin farm selection. |

**All 3 requirements satisfied. No orphaned requirements found.**

### Anti-Patterns Found

**None.** All modified files scanned for TODO/FIXME/PLACEHOLDER/stub patterns. No anti-patterns detected.

### Deep Verification: Database Layer

**RLS Policies Alignment:**

Verified that core data tables use the same isolation pattern:

- **wells**: `farm_id IN (SELECT get_user_farm_ids())` for SELECT, INSERT, UPDATE, DELETE (migration 017 line 86, migration 032 lines 37, 41)
- **readings**: `farm_id IN (SELECT get_user_farm_ids())` for SELECT, INSERT; `farm_id IN (SELECT get_user_admin_farm_ids())` for UPDATE, DELETE (migration 031)
- **allocations**: `farm_id IN (SELECT get_user_farm_ids())` for all operations (migration 031)
- **farm_members**: `user_id = auth.uid()` OR `farm_id IN (SELECT get_user_farm_ids())` for SELECT only (migration 011 lines 67-73)

**PowerSync Sync Rules Alignment:**

Verified all farm-scoped buckets use identical parameterization:

- **farm_wells**: `parameters: SELECT farm_id FROM farm_members WHERE user_id = request.user_id()`
- **farm_readings**: Same parameterization
- **farm_allocations**: Same parameterization
- **farm_members**: Same parameterization
- **user_farms**: Same parameterization
- **farm_invites**: Same parameterization

**PowerSync Connector RLS Enforcement:**

Verified that powersync-connector.ts line 126: `supabase.from(table).upsert(data)` and line 141: `supabase.from(table).delete().eq('id', op.id)` both use the authenticated Supabase client, which enforces RLS policies. No service_role bypass exists. All offline-queued writes replay through RLS when connectivity is restored.

**Super Admin Consistency:**

Verified migration 025 triggers:
- `trigger_add_super_admins_to_new_farm`: When farm is created, adds all existing super_admin users
- `trigger_add_super_admin_to_all_farms`: When user is promoted to super_admin, adds them to all existing farms
- `trigger_add_super_admin_to_all_farms_on_insert`: When new user is created with super_admin role, adds them to all farms

This auto-membership approach means:
- RLS policies: `get_user_farm_ids()` returns all farm IDs for super_admin
- PowerSync sync rules: `farm_members WHERE user_id = request.user_id()` returns all farm IDs for super_admin
- Client-side: useActiveFarm() allows super_admin to override via FarmSelector, persists choice to localStorage

**No special-case code needed** — membership-based approach provides consistent cross-farm access.

### Commit Verification

All 6 commits from plans 22-01 and 22-02 verified in git history:

- `1fd366a` — feat(22-01): clean stale join_farm_with_code_impl and add super_admin_user_id setting
- `45a68b0` — docs(22-01): comprehensive farm data isolation audit report
- `b24f209` — feat(22-02): replace authStatus.farmId with useActiveFarm in data hooks
- `5c9d95b` — feat(22-02): replace authStatus.farmId with useActiveFarm in pages and components
- `96b597d` — feat(22-02): add persist middleware, maroon header, and sync rules docs
- `745f826` — fix(22-02): WellEditPage farmName from useActiveFarm for consistency

### Client-Side Isolation

**Verified authStatus?.farmId elimination:**

Only 3 files still use `authStatus?.farmId` (all intentional):
1. `src/hooks/useActiveFarm.ts` — source of active farm logic
2. `src/hooks/useUserRole.ts` — circular dependency avoidance (safe: super_admin has 'super_admin' role in all farms)
3. `src/components/FarmSelector.tsx` — needs ownFarmId to distinguish user's primary farm from override

All data hooks and pages (13 files) verified to use `useActiveFarm().farmId`:
- 4 hooks: useWells.ts, useWellCount.ts, useSubscriptionTier.ts, useSeatUsage.ts
- 8 pages: DashboardPage.tsx, WellListPage.tsx, WellDetailPage.tsx, WellEditPage.tsx, WellAllocationsPage.tsx, UsersPage.tsx, SubscriptionPage.tsx, SettingsPage.tsx
- 2 components: PendingInvitesList.tsx, AddUserModal.tsx

## Summary

**All phase 22 must-haves verified:**

1. **Database isolation** — RLS policies and sync rules correctly filter by farm_id via get_user_farm_ids()
2. **Stale code cleaned** — join_farm_with_code_impl no longer references dropped farms.invite_code column
3. **Super admin infrastructure** — super_admin_user_id app_setting added, auto-membership triggers verified
4. **Client-side isolation** — All data queries use useActiveFarm() for farm selection (13 files migrated)
5. **Persistence** — activeFarmStore uses Zustand persist middleware with localStorage
6. **Visual awareness** — Header displays maroon (#800000) background for super_admin users
7. **Documentation** — Comprehensive 8-layer audit report produced, sync rules docs updated

**Phase goal achieved:** Every database query and sync rule correctly isolates farm data. Super admin has verified cross-farm access that is consistent across RLS policies (via auto-membership → get_user_farm_ids()), PowerSync sync rules (via auto-membership → farm_members bucket params), and client-side UI (via useActiveFarm() + FarmSelector + persisted override).

**No gaps found. All requirements satisfied. Ready to proceed.**

---

_Verified: 2026-02-22T21:15:00Z_
_Verifier: Claude (gsd-verifier)_
