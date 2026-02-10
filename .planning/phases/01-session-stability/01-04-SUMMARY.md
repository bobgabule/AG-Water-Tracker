---
phase: 01-session-stability
plan: 04
subsystem: auth, ui
tags: [react, error-boundary, auth-state, loading-state, powersync]

# Dependency graph
requires:
  - phase: 01-session-stability
    provides: "AuthProvider with timeout/retry, ErrorBoundary setup, RequireOnboarded component"
provides:
  - "isFetchingOnboarding flag in auth context distinguishing fetch-in-progress from fetch-failed"
  - "Scoped ErrorBoundary wrapping only Outlet, preserving Header/SideMenu on crash"
  - "Navigation-based ErrorBoundary reset via resetKeys"
affects: [02-offline-session-resilience, ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns: [try/finally fetch tracking, scoped error boundaries, resetKeys navigation reset]

key-files:
  created: []
  modified:
    - src/lib/AuthProvider.tsx
    - src/components/RequireOnboarded.tsx
    - src/components/AppLayout.tsx

key-decisions:
  - "isFetchingOnboarding as separate boolean state rather than enum -- simpler API, one concern per flag"
  - "resetKeys={[location.pathname]} on ErrorBoundary for automatic reset on route navigation"

patterns-established:
  - "Fetch-tracking pattern: set flag true before async call, false in finally block, expose via context"
  - "Scoped error boundaries: wrap only content areas, keep navigation accessible during errors"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 1 Plan 4: Auth Fetch Tracking and Scoped Error Boundary Summary

**isFetchingOnboarding flag eliminates false "Something went wrong" flash during auth init; ErrorBoundary scoped to Outlet preserves navigation on page crashes**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T12:31:20Z
- **Completed:** 2026-02-10T12:34:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Auth flow during OTP verification shows spinner during onboarding fetch, never flashes error UI
- Page component crashes preserve Header and SideMenu navigation -- users can navigate away without full reload
- ErrorBoundary auto-resets when user navigates to a different route via resetKeys

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isFetchingOnboarding flag to AuthProvider and update RequireOnboarded** - `b74d8b0` (feat)
2. **Task 2: Scope ErrorBoundary in AppLayout to wrap only Outlet** - `aabe26f` (feat)

## Files Created/Modified
- `src/lib/AuthProvider.tsx` - Added isFetchingOnboarding state, try/finally wrappers around all fetchOnboardingStatus calls, exported in context type and value
- `src/components/RequireOnboarded.tsx` - Added fetch-in-progress spinner check before error/retry UI check
- `src/components/AppLayout.tsx` - Moved ErrorBoundary inside AppLayoutContent wrapping only Outlet, added resetKeys for navigation-based reset

## Decisions Made
- Used separate boolean `isFetchingOnboarding` rather than a combined status enum -- keeps the API simple and each flag has one concern
- Added `resetKeys={[location.pathname]}` to ErrorBoundary so navigating away from a crashed page automatically resets the boundary without manual reset logic

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both UAT gaps (false error flash and full-page error boundary) are now resolved
- Plan 01-05 (WASM/useWebWorker flag) remains as the final plan in phase 01

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit b74d8b0 (Task 1) verified in git log
- Commit aabe26f (Task 2) verified in git log
- TypeScript compiles with zero errors

---
*Phase: 01-session-stability*
*Completed: 2026-02-10*
