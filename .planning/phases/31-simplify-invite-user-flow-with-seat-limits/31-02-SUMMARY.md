---
phase: 31-simplify-invite-user-flow-with-seat-limits
plan: 02
subsystem: ui
tags: [powersync, react, supabase, edge-functions, twilio, sms]

# Dependency graph
requires:
  - phase: 31-01
    provides: "Database migration 039 with extra_admin_seats/extra_meter_checker_seats columns and server-side seat limit enforcement"
provides:
  - "PowerSync schema with extra seat columns on farms table"
  - "Seat usage hook that includes per-farm extra seats in limit calculations"
  - "Instructive SMS invite message with sign-in guidance"
  - "User-friendly NoSubscriptionPage with farm access context"
  - "AddUserModal server-side seat limit error surfacing"
affects: [invite-flow, seat-limits, user-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extra seats pattern: tier limit + farm extra seats = effective limit"

key-files:
  created: []
  modified:
    - src/lib/powersync-schema.ts
    - src/hooks/useSeatUsage.ts
    - supabase/functions/send-invite-sms/index.ts
    - src/pages/NoSubscriptionPage.tsx
    - src/components/AddUserModal.tsx

key-decisions:
  - "Display server seat limit error messages directly (already user-friendly from migration 039)"

patterns-established:
  - "Extra seats on farms: query farm row for extra_admin_seats/extra_meter_checker_seats and add to tier limits"

requirements-completed: [TIER-D1]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 31 Plan 02: Frontend Seat Limits and UX Messaging Summary

**Extra seat columns in PowerSync schema, seat usage hook with per-farm extra seats, instructive SMS invite, and improved no-farm-access UX**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T02:40:59Z
- **Completed:** 2026-02-25T02:43:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PowerSync farms table now includes extra_admin_seats and extra_meter_checker_seats integer columns
- Seat usage hook queries farm extra seats and adds them to tier limits in calcRole calculations
- SMS invite message instructs users to sign in with their phone number at the app URL
- NoSubscriptionPage heading changed to "No Farm Access" with guidance to contact farm admin or subscribe
- AddUserModal catches and displays server-side seat limit error messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Update PowerSync schema and seat usage hook** - `a1f5004` (feat)
2. **Task 2: Update SMS message, NoSubscriptionPage, and AddUserModal error handling** - `0d141a4` (feat)

## Files Created/Modified
- `src/lib/powersync-schema.ts` - Added extra_admin_seats and extra_meter_checker_seats columns to farms TableV2
- `src/hooks/useSeatUsage.ts` - Added farm extra seats query and updated calcRole to accept extraSeats parameter
- `supabase/functions/send-invite-sms/index.ts` - Updated SMS message to instruct sign-in with phone number
- `src/pages/NoSubscriptionPage.tsx` - Changed heading to "No Farm Access" with descriptive guidance text
- `src/components/AddUserModal.tsx` - Added seat limit error handling for "no available" server messages

## Decisions Made
- Display server seat limit error messages directly to users since migration 039 already formats them in a user-friendly way (e.g., "No available admin seats. Your plan allows 2 (2 active, 0 pending).")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 31 complete: server-side seat limits (plan 01) and frontend support (plan 02) both done
- Extra seat columns synced via PowerSync and reflected in seat usage calculations
- SMS messages provide clear onboarding instructions

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit a1f5004 verified in git log
- Commit 0d141a4 verified in git log
- TypeScript compilation passes with zero errors

---
*Phase: 31-simplify-invite-user-flow-with-seat-limits*
*Completed: 2026-02-25*
