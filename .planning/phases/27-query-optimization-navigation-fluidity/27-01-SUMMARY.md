---
phase: 27-query-optimization-navigation-fluidity
plan: 01
subsystem: ui
tags: [powersync, sql-join, view-transitions-api, react-router, css]

# Dependency graph
requires:
  - phase: 23-code-splitting-preload
    provides: Lazy route loading and prefetch infrastructure
provides:
  - Single JOIN query for useSubscriptionTier (eliminates one round-trip)
  - View Transitions API 150ms cross-fade on all page navigations
affects: [navigation, subscription-tier, page-transitions]

# Tech tracking
tech-stack:
  added: []
  patterns: [view-transitions-api-crossfade, single-join-powersync-query]

key-files:
  created: []
  modified:
    - src/hooks/useSubscriptionTier.ts
    - src/index.css
    - src/components/SideMenu.tsx
    - src/pages/DashboardPage.tsx
    - src/pages/WellDetailPage.tsx
    - src/pages/WellListPage.tsx
    - src/pages/WellEditPage.tsx
    - src/pages/WellAllocationsPage.tsx
    - src/pages/SettingsPage.tsx
    - src/pages/NoSubscriptionPage.tsx
    - src/pages/auth/VerifyPage.tsx
    - src/pages/auth/PhonePage.tsx

key-decisions:
  - "navigate(-1) cannot accept viewTransition option in React Router v7 numeric overload -- left as instant navigation"
  - "PhonePage.tsx included in viewTransition updates despite not being in plan file list, for full codebase coverage"

patterns-established:
  - "viewTransition: true on all navigate() calls for consistent cross-fade"
  - "Single JOIN query pattern for PowerSync hooks that span two tables"

requirements-completed: [NAV-01, NAV-02]

# Metrics
duration: 6min
completed: 2026-02-25
---

# Phase 27 Plan 01: Query Optimization & Navigation Fluidity Summary

**Single JOIN query for tier lookup and 150ms View Transitions API cross-fade on all page navigations**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T01:01:53Z
- **Completed:** 2026-02-25T01:08:45Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Replaced two-step sequential query in useSubscriptionTier with single JOIN (one round-trip instead of two)
- Added 150ms cross-fade animation via View Transitions API to all programmatic navigations
- Maintained identical return shape for useSubscriptionTier -- zero consumer changes needed
- Graceful fallback on unsupported browsers (Firefox/Safari) -- instant navigation, no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Single JOIN query for useSubscriptionTier** - `83f3feb` (feat)
2. **Task 2: View Transitions API cross-fade on all page navigations** - `bc84c07` (feat)

## Files Created/Modified
- `src/hooks/useSubscriptionTier.ts` - Replaced two useQuery calls with single JOIN query
- `src/index.css` - Added ::view-transition-old/new(root) 150ms animation-duration
- `src/components/SideMenu.tsx` - Added viewTransition: true to handleNav and handleSignOut
- `src/pages/DashboardPage.tsx` - Added viewTransition: true to handleWellClick and handleWellList
- `src/pages/WellDetailPage.tsx` - Added viewTransition: true to handleClose and handleEdit
- `src/pages/WellListPage.tsx` - Added viewTransition: true to handleWellClick, handleNewWell, handleWellMap
- `src/pages/WellEditPage.tsx` - Added viewTransition: true to all 6 navigate calls (merged with replace where needed)
- `src/pages/WellAllocationsPage.tsx` - Added viewTransition: true to handleBack
- `src/pages/SettingsPage.tsx` - Added viewTransition: true to handleSignOut and subscription navigate (handleBack uses navigate(-1) which cannot accept options)
- `src/pages/NoSubscriptionPage.tsx` - Added viewTransition: true merged with replace: true on both navigate calls
- `src/pages/auth/VerifyPage.tsx` - Added viewTransition: true to all 4 navigate calls
- `src/pages/auth/PhonePage.tsx` - Added viewTransition: true to both navigate calls (deviation: not in plan file list)

## Decisions Made
- navigate(-1) in SettingsPage.handleBack left without viewTransition because React Router v7's numeric navigation overload does not accept an options parameter (TypeScript error TS2345)
- PhonePage.tsx included for full coverage despite not being in plan's explicit file list

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added viewTransition to PhonePage.tsx navigate calls**
- **Found during:** Task 2 (View Transitions API)
- **Issue:** PhonePage.tsx has 2 navigate() calls not listed in plan but verification criteria requires ALL navigate calls to have viewTransition
- **Fix:** Added viewTransition: true to both navigate calls in PhonePage.tsx
- **Files modified:** src/pages/auth/PhonePage.tsx
- **Verification:** npx tsc -b --noEmit passes, grep confirms all navigate calls updated
- **Committed in:** bc84c07 (Task 2 commit)

**2. [Rule 1 - Bug] Reverted navigate(-1) viewTransition that caused TypeScript error**
- **Found during:** Task 2 (View Transitions API)
- **Issue:** navigate(-1, { viewTransition: true }) produces TS2345 -- numeric overload has no options parameter
- **Fix:** Left navigate(-1) without options as React Router v7 does not support it
- **Files modified:** src/pages/SettingsPage.tsx
- **Verification:** npx tsc -b --noEmit passes cleanly
- **Committed in:** bc84c07 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness and type safety. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- View Transitions API foundation in place for any future page transitions
- useSubscriptionTier optimized -- pattern can be applied to other multi-table hooks
- Ready for Phase 27 Plan 02

---
*Phase: 27-query-optimization-navigation-fluidity*
*Completed: 2026-02-25*
