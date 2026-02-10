---
phase: 03-role-foundation
plan: 01
subsystem: auth
tags: [typescript, roles, permissions, powersync, hooks]

# Dependency graph
requires:
  - phase: 02-offline-session-resilience
    provides: "useAuth hook with onboardingStatus.farmId for farm context"
provides:
  - "Role and Action types as narrow string literal unions"
  - "PERMISSION_MATRIX mapping roles to allowed action sets"
  - "hasPermission(role, action) function for permission checks"
  - "isAdminOrAbove(role) helper for admin-level checks"
  - "ROLE_DISPLAY_NAMES for UI rendering"
  - "useUserRole() hook returning Role | null from farm_members table"
affects: [03-role-foundation, 04-permission-enforcement, role-based-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [centralized-permission-matrix, typed-role-action-unions, farm-members-role-authority]

key-files:
  created:
    - src/lib/permissions.ts
    - src/hooks/useUserRole.ts
  modified: []

key-decisions:
  - "String literal unions over enums for Role/Action types -- zero runtime overhead"
  - "Set<Action> for PERMISSION_MATRIX -- O(1) lookup performance"
  - "farm_members.role is authoritative role source, not users.role -- deliberate separation"
  - "Four-role hierarchy: super_admin > grower > admin > meter_checker"

patterns-established:
  - "Permission check pattern: import hasPermission from permissions.ts, never hardcode role strings"
  - "Role query pattern: useUserRole() queries farm_members with userId + farmId guard"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 3 Plan 1: Permission Matrix & useUserRole Summary

**Centralized TypeScript permission matrix with Role/Action types, hasPermission() check, and useUserRole hook querying farm_members**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T08:09:47Z
- **Completed:** 2026-02-10T08:13:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created centralized permission matrix with four roles and nine gatable actions
- Built hasPermission() and isAdminOrAbove() helper functions with null-safe handling
- Created useUserRole hook following established guarded query + useMemo pattern
- All permission logic verified at runtime (correct true/false for all edge cases)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create permission matrix module** - `1f21ea8` (feat)
2. **Task 2: Create useUserRole hook** - `02a1512` (feat)

## Files Created/Modified
- `src/lib/permissions.ts` - Role/Action types, PERMISSION_MATRIX, hasPermission(), isAdminOrAbove(), ROLE_DISPLAY_NAMES
- `src/hooks/useUserRole.ts` - useUserRole() hook returning Role | null from farm_members via PowerSync

## Decisions Made
- Used string literal unions (`as const`) instead of enums for Role and Action types -- zero runtime overhead, better tree-shaking
- Used `Set<Action>` for the permission matrix instead of arrays -- O(1) permission lookups
- farm_members.role is the authoritative role source (not users.role) -- deliberate separation per plan specification
- Four-role hierarchy established: super_admin (all + cross-farm), grower (all except cross-farm), admin (manage but not farm settings), meter_checker (read + record only)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Permission matrix ready for Phase 3 Plan 2+ (role-based UI, permission enforcement)
- useUserRole hook available for any component needing role-aware rendering
- No blockers identified

## Self-Check: PASSED

- [x] src/lib/permissions.ts exists
- [x] src/hooks/useUserRole.ts exists
- [x] 03-01-SUMMARY.md exists
- [x] Commit 1f21ea8 found (Task 1)
- [x] Commit 02a1512 found (Task 2)

---
*Phase: 03-role-foundation*
*Completed: 2026-02-10*
