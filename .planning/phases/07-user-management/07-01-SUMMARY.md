---
phase: 07-user-management
plan: 01
subsystem: database, auth
tags: [supabase, powersync, security-definer, role-hierarchy, session-guard]

# Dependency graph
requires:
  - phase: 03-role-foundation
    provides: "Role hierarchy (super_admin > grower > admin > meter_checker) and permissions.ts"
  - phase: 06-invite-system
    provides: "farm_members table structure and remove_farm_member RPC pattern"
provides:
  - "is_disabled column on farm_members (INTEGER 0/1)"
  - "disable_farm_member and enable_farm_member RPCs with role hierarchy enforcement"
  - "PowerSync schema with is_disabled column for offline sync"
  - "ROLE_BADGE_STYLES constant for colored role pills in UI"
  - "Disabled-user session guard (auto sign-out on is_disabled=1)"
affects: [07-02-PLAN, user-management-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["disable/enable RPC pair following private impl + public SECURITY DEFINER wrapper pattern"]

key-files:
  created:
    - supabase/migrations/029_disable_farm_member.sql
  modified:
    - src/lib/powersync-schema.ts
    - src/lib/permissions.ts
    - src/components/AppLayout.tsx

key-decisions:
  - "INTEGER for is_disabled (not BOOLEAN) because PowerSync does not support BOOLEAN type"
  - "alert() for disabled-user message -- simple enough for rare edge case, avoids over-engineering"
  - "Same role hierarchy for enable as disable -- only those who can disable can re-enable"

patterns-established:
  - "Disable/enable RPC pair: same private impl pattern as remove_farm_member (migration 027)"
  - "Session guard via useQuery in AppLayout: reactive PowerSync query triggers useEffect sign-out"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 7 Plan 1: Disable/Enable Infrastructure Summary

**Database is_disabled column with role-hierarchy RPCs, PowerSync schema sync, role badge styles, and disabled-user session guard in AppLayout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-11T06:33:07Z
- **Completed:** 2026-02-11T06:36:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Migration 029 adds is_disabled INTEGER column to farm_members with disable/enable RPCs enforcing full role hierarchy
- PowerSync schema updated to sync is_disabled column for offline-first access
- ROLE_BADGE_STYLES constant added to permissions.ts for plan 02's user management UI
- Disabled-user session guard in AppLayout auto-signs-out disabled users with alert message

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for is_disabled column and disable/enable RPCs** - `aed7e38` (feat)
2. **Task 2: Update PowerSync schema, add ROLE_BADGE_STYLES, and add disabled-user session guard** - `4baba09` (feat)

## Files Created/Modified
- `supabase/migrations/029_disable_farm_member.sql` - ALTER TABLE + 4 functions (2 private impls, 2 public wrappers) + GRANT + NOTIFY
- `src/lib/powersync-schema.ts` - Added is_disabled: column.integer to farm_members TableV2
- `src/lib/permissions.ts` - Added ROLE_BADGE_STYLES export with per-role Tailwind classes
- `src/components/AppLayout.tsx` - Added useQuery for is_disabled check + useEffect sign-out guard

## Decisions Made
- Used INTEGER (not BOOLEAN) for is_disabled because PowerSync doesn't support BOOLEAN type (consistent with existing send_monthly_report pattern)
- Used alert() for disabled-user notification -- this is a rare edge case (only fires when a currently-logged-in user gets disabled), a toast or modal would be over-engineering
- Applied same role hierarchy checks to enable as to disable -- the people who can disable should be the only ones who can re-enable
- Placed disabled-user query in AppLayout (not AuthProvider) since it requires PowerSync which is only available inside PowerSyncProvider

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. PowerSync Dashboard sync rules for is_disabled column will need to be updated when the migration is applied to Supabase (handled as part of plan 02 or manual setup).

## Next Phase Readiness
- Database infrastructure ready: is_disabled column and RPCs will work once migration is applied to Supabase
- PowerSync schema ready: will sync is_disabled once dashboard sync rules include the column
- Session guard ready: disabled users will be signed out automatically
- ROLE_BADGE_STYLES ready for plan 02's user management UI components

## Self-Check: PASSED

- All 5 files verified as existing on disk
- Commit aed7e38 verified in git log
- Commit 4baba09 verified in git log
- TypeScript compilation: zero errors

---
*Phase: 07-user-management*
*Completed: 2026-02-11*
