---
phase: 31-simplify-invite-user-flow-with-seat-limits
plan: 01
subsystem: database
tags: [postgresql, rpc, seat-limits, phone-normalization, supabase]

# Dependency graph
requires:
  - phase: 31 (migration 038)
    provides: invite_user_by_phone RPC with admin role escalation check
provides:
  - Server-side seat limit enforcement in invite RPC
  - Per-farm extra seat columns (extra_admin_seats, extra_meter_checker_seats)
  - Fixed phone format normalization in duplicate member check
affects: [31-02, subscription-tiers, farm-management, invite-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [tier-based seat limits with active+pending counting, phone normalization with '+' prefix for auth.users]

key-files:
  created:
    - supabase/migrations/039_seat_limit_enforcement.sql
  modified: []

key-decisions:
  - "Seat limit counts both active members AND pending invites to prevent over-allocation"
  - "Effective limit = tier max + farm extra seats (enables future add-on seat purchases)"
  - "COALESCE on tier_limit and extra_seats to handle NULL gracefully (defaults to 0)"

patterns-established:
  - "Phone normalization: always use '+' || au.phone when comparing auth.users.phone to E.164 stored values"
  - "Seat counting: active farm_members + unexpired farm_invites for role-based limits"

requirements-completed: [TIER-D1]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 31 Plan 01: Seat Limit Enforcement Summary

**Server-side seat limit enforcement in invite RPC with per-farm extra seat columns and phone format bug fix**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T02:40:59Z
- **Completed:** 2026-02-25T02:42:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added extra_admin_seats and extra_meter_checker_seats columns to farms table
- Enforced tier-based seat limits counting active members + pending invites against tier max + extra seats
- Fixed phone format bug in duplicate member check (auth.users.phone stores without '+' prefix)
- Descriptive error message includes role name, effective limit, active count, and pending count

## Task Commits

Each task was committed atomically:

1. **Task 1: Add extra seat columns and enforce seat limits in invite RPC** - `a68ab05` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/039_seat_limit_enforcement.sql` - Migration with schema changes, updated RPC, public wrapper, grants

## Decisions Made
- Seat limit counts both active members AND pending invites to prevent over-allocation during concurrent invite flows
- Effective limit formula: COALESCE(tier_limit, 0) + COALESCE(extra_seats, 0) handles NULL gracefully
- Phone normalization uses '+' || au.phone pattern (matching migration 037 fix for get_onboarding_status)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Migration must be applied to Supabase via `npx supabase db push` or dashboard.

## Next Phase Readiness
- Seat limits enforced server-side, ready for client-side seat count display (Plan 02)
- Extra seat columns available for future add-on seat purchase flow

## Self-Check: PASSED

- FOUND: supabase/migrations/039_seat_limit_enforcement.sql
- FOUND: commit a68ab05
- FOUND: 31-01-SUMMARY.md

---
*Phase: 31-simplify-invite-user-flow-with-seat-limits*
*Completed: 2026-02-25*
