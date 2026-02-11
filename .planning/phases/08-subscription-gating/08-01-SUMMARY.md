---
phase: 08-subscription-gating
plan: 01
subsystem: ui
tags: [subscription, seat-gating, powersync, react-hooks, typescript]

# Dependency graph
requires:
  - phase: 06-invite-system
    provides: farm_invites table and invite flow
  - phase: 07-user-management
    provides: farm_members with is_disabled column
provides:
  - PLAN_LIMITS constants (Basic plan: 1 admin + 3 meter checkers)
  - useSeatUsage hook (per-role seat counting with limit comparison)
  - SeatUsage and RoleSeatUsage types for downstream UI
  - isSeatLimited helper for role checks
affects: [08-02, 08-03, subscription-ui, invite-gating, user-management-gating]

# Tech tracking
tech-stack:
  added: []
  patterns: [hardcoded-plan-constants, seat-counting-hook, exempt-role-filtering]

key-files:
  created:
    - src/lib/subscription.ts
    - src/hooks/useSeatUsage.ts
  modified: []

key-decisions:
  - "Hardcoded plan constants (no DB table) per SUBS-03 -- UI-only gating"
  - "SQL-level exempt role filtering (IN clause) rather than client-side post-filter"
  - "RoleSeatUsage interface with isFull boolean for simple downstream conditional rendering"

patterns-established:
  - "Subscription plan limits as hardcoded constants in src/lib/subscription.ts"
  - "Seat counting combines active members + pending invites per role"
  - "Exempt roles (grower, super_admin) excluded at SQL query level"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 8 Plan 1: Subscription Constants and Seat Usage Summary

**Hardcoded Basic plan limits (1 admin + 3 meter checkers) with PowerSync-backed seat counting hook combining active members and pending invites per role**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-11T11:15:54Z
- **Completed:** 2026-02-11T11:18:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created subscription plan constants with Basic plan definition (1 admin, 3 meter checkers)
- Built useSeatUsage hook that queries farm_members and farm_invites via PowerSync
- Exempt roles (grower, super_admin) excluded from seat counting at SQL level
- Disabled members and used/expired invites excluded from counts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create subscription plan constants and types** - `cf7bdd7` (feat)
2. **Task 2: Create useSeatUsage hook** - `40dd1e0` (feat)

## Files Created/Modified
- `src/lib/subscription.ts` - Plan limits constants, types (PlanLimits, RoleSeatInfo), exempt roles, isSeatLimited helper
- `src/hooks/useSeatUsage.ts` - Hook returning per-role seat usage (used/limit/available/isFull) from PowerSync queries

## Decisions Made
- **Hardcoded constants over DB table:** Per SUBS-03, plan limits are UI-only gating. No migration needed.
- **SQL-level role filtering:** Used `role IN (?)` clause to filter exempt roles in the SQL query itself rather than fetching all roles and filtering client-side. More efficient and clearer intent.
- **Separate RoleSeatUsage interface:** Extracted from inline type to named interface for reuse in downstream plans (08-02 invite gating, 08-03 subscription page).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- subscription.ts and useSeatUsage hook ready for consumption by:
  - 08-02 (invite gating UI) - will use useSeatUsage to show/disable invite button
  - 08-03 (subscription page) - will display seat usage dashboard
- All types exported for downstream use
- Zero TypeScript errors

## Self-Check: PASSED

- [x] src/lib/subscription.ts -- FOUND
- [x] src/hooks/useSeatUsage.ts -- FOUND
- [x] 08-01-SUMMARY.md -- FOUND
- [x] Commit cf7bdd7 -- FOUND
- [x] Commit 40dd1e0 -- FOUND

---
*Phase: 08-subscription-gating*
*Completed: 2026-02-11*
