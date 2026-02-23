---
phase: 21-login-only-auth-flow
plan: 03
subsystem: auth, database
tags: [supabase, rpc, powersync, react, sign-out, auto-join]

# Dependency graph
requires:
  - phase: 21-login-only-auth-flow (plans 01, 02)
    provides: Login-only auth flow, invite auto-join private impl, NoSubscriptionPage
provides:
  - Fixed public RPC wrapper delegating to updated private get_onboarding_status_impl
  - Race-condition-free auto-redirect on NoSubscriptionPage
  - Timeout-guarded PowerSync disconnect for fast sign-out
affects: [phase-21-uat-retest]

# Tech tracking
tech-stack:
  added: []
  patterns: [Promise.race timeout guard for unreliable async operations]

key-files:
  created:
    - supabase/migrations/035_fix_onboarding_status_wrapper.sql
  modified:
    - src/pages/NoSubscriptionPage.tsx
    - src/lib/AuthProvider.tsx

key-decisions:
  - "Recreate public wrapper rather than modify migration 034 -- preserves migration history"
  - "Remove navigate from visibilitychange handler, rely on existing authStatus effect for navigation"
  - "2-second timeout on disconnectAndClear via Promise.race -- safety net, not primary fix"

patterns-established:
  - "Promise.race timeout pattern: wrap unreliable async calls with a timeout fallback"
  - "Separate state refresh from navigation: let React effects handle routing after state propagates"

requirements-completed: [AUTH-04, AUTH-05, AUTH-06]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 21 Plan 03: Gap Closure Summary

**Fixed 3 UAT failures: RPC wrapper recreation for invite auto-join, race-condition-free tab-focus redirect, and 2s timeout on PowerSync disconnect during sign-out**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-23T11:14:31Z
- **Completed:** 2026-02-23T11:16:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed blocker: invite auto-join now works on login by recreating the public RPC wrapper to delegate to the updated private impl from migration 034
- Fixed major issue: tab-focus auto-redirect no longer loops -- visibilitychange only refreshes auth state, navigation deferred to React effect after state propagation
- Fixed minor issue: sign-out completes in at most ~2 seconds even when PowerSync is unresponsive or uninitialized

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix invite auto-join RPC and auto-redirect race condition** - `efc8e71` (fix)
2. **Task 2: Speed up sign-out with PowerSync disconnect timeout** - `50352c6` (fix)

## Files Created/Modified
- `supabase/migrations/035_fix_onboarding_status_wrapper.sql` - Recreates public.get_onboarding_status() wrapper to delegate to updated private impl with invite auto-join logic
- `src/pages/NoSubscriptionPage.tsx` - Removed navigate() from visibilitychange handler; navigation now handled by authStatus effect
- `src/lib/AuthProvider.tsx` - Wrapped disconnectAndClear() in Promise.race with 2s timeout in signOut()

## Decisions Made
- Recreate public wrapper in new migration 035 rather than modifying migration 034 -- preserves migration history and makes the fix auditable
- Remove navigate from visibilitychange handler entirely, relying on the existing authStatus.hasFarmMembership effect for navigation -- this guarantees React state has propagated before route change
- 2-second timeout chosen for PowerSync disconnect -- long enough for a healthy disconnect, short enough to not frustrate users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**Migration 035 must be applied to the Supabase database.** Run this migration in the Supabase dashboard or via CLI to recreate the public RPC wrapper.

## Next Phase Readiness
- All 3 UAT failures (Tests 4, 5, 7) now have targeted fixes
- Phase 21 ready for UAT re-test after deploying migration 035
- No new dependencies or blockers introduced

## Self-Check: PASSED

- [x] supabase/migrations/035_fix_onboarding_status_wrapper.sql exists
- [x] src/pages/NoSubscriptionPage.tsx exists
- [x] src/lib/AuthProvider.tsx exists
- [x] 21-03-SUMMARY.md exists
- [x] Commit efc8e71 exists (Task 1)
- [x] Commit 50352c6 exists (Task 2)
- [x] TypeScript compilation passes with zero errors

---
*Phase: 21-login-only-auth-flow*
*Completed: 2026-02-23*
