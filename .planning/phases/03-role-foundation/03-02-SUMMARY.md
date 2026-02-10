---
phase: 03-role-foundation
plan: 02
subsystem: database
tags: [postgres, migration, roles, check-constraints, rls, security-definer]

# Dependency graph
requires:
  - phase: 01-session-stability
    provides: Private schema pattern (migration 020) with SECURITY DEFINER functions
provides:
  - Four-role CHECK constraints on farm_members and farm_invites
  - Updated get_user_admin_farm_ids() helper propagating new roles to all RLS policies
  - Updated private schema functions with new role validation
  - Updated public wrapper defaults from 'member' to 'meter_checker'
affects: [03-role-foundation, powersync-sync-rules, frontend-role-checks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Data migration before constraint swap to avoid CHECK violations"
    - "Helper function update propagates role changes to all dependent RLS policies"

key-files:
  created:
    - supabase/migrations/021_four_role_system.sql
  modified: []

key-decisions:
  - "Updated DEFAULT parameter values from 'member' to 'meter_checker' on public wrappers and private impls to prevent runtime errors"
  - "super_admin role added to farm_members but not to farm_invites (not assignable via invite)"

patterns-established:
  - "Role rename via UPDATE-before-constraint-swap: safe atomic migration pattern"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 3 Plan 2: Database Role Migration Summary

**Atomic migration from 3-role (owner/admin/member) to 4-role (super_admin/grower/admin/meter_checker) system with CHECK constraints, helper function, and private function updates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T08:09:51Z
- **Completed:** 2026-02-10T08:14:10Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created migration 021 that atomically renames all database roles from old to new system
- Updated CHECK constraints on both farm_members (4 roles) and farm_invites (2 invitable roles)
- Updated get_user_admin_farm_ids() helper so all RLS policies automatically use new role names
- Updated all 4 private schema functions with new role validation and permission checks
- Updated public wrapper function defaults and comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Create role system migration** - `3292ff9` (feat)

## Files Created/Modified
- `supabase/migrations/021_four_role_system.sql` - Complete role rename migration: data updates, constraint swaps, helper function update, private function updates, public wrapper updates

## Decisions Made
- Updated DEFAULT parameter values from 'member' to 'meter_checker' on both public wrappers (`create_invite_code`, `invite_user_by_phone`) and their private implementations -- callers using default would otherwise hit CHECK violation or validation error
- super_admin is available in farm_members but excluded from farm_invites CHECK constraint (not assignable via invite flow)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated DEFAULT parameter values from 'member' to 'meter_checker'**
- **Found during:** Task 1 (verification step)
- **Issue:** The plan specified updating role validation strings inside function bodies but did not mention updating the `DEFAULT 'member'` parameter values in function signatures. Leaving these as `'member'` would cause callers using defaults to fail against the new CHECK constraint and validation logic.
- **Fix:** Changed `DEFAULT 'member'` to `DEFAULT 'meter_checker'` on both private impls (`create_invite_code_impl`, `invite_user_by_phone_impl`) and their public wrappers (`create_invite_code`, `invite_user_by_phone`)
- **Files modified:** supabase/migrations/021_four_role_system.sql
- **Verification:** Grep confirmed no remaining `DEFAULT 'member'` in active code
- **Committed in:** 3292ff9 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix -- without it, any caller using default role parameter would get a validation error. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Migration is ready to apply to Supabase via `supabase db push` or dashboard migration.

## Next Phase Readiness
- Database role system is fully migrated and ready for PowerSync sync rules update (plan 03-03)
- Frontend role string updates can proceed (plan 03-04)
- All RLS policies automatically use new roles via get_user_admin_farm_ids() helper

## Self-Check: PASSED

- [x] supabase/migrations/021_four_role_system.sql -- FOUND
- [x] .planning/phases/03-role-foundation/03-02-SUMMARY.md -- FOUND
- [x] Commit 3292ff9 -- FOUND in git log

---
*Phase: 03-role-foundation*
*Completed: 2026-02-10*
