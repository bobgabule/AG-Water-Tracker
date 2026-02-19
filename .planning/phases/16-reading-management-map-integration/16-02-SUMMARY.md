---
phase: 16-reading-management-map-integration
plan: 02
subsystem: ui
tags: [powersync, react-hooks, mapbox, allocation, readings]

# Dependency graph
requires:
  - phase: 12-data-foundation
    provides: readings and allocations tables with farm_id denormalization
  - phase: 13-well-detail-page
    provides: WellMarker component, MapView component, WellListPage
provides:
  - useCurrentAllocations hook for batch allocation queries
  - useLatestReadings hook for batch latest reading queries
  - Real allocation gauge on map markers
  - Actual reading dates on well list page
affects: [well-detail-page, dashboard, reading-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [batch-query-hooks-with-memoized-maps, prop-drilling-allocation-data]

key-files:
  created:
    - src/hooks/useCurrentAllocations.ts
    - src/hooks/useLatestReadings.ts
  modified:
    - src/components/WellMarker.tsx
    - src/components/MapView.tsx
    - src/pages/DashboardPage.tsx
    - src/pages/WellListPage.tsx

key-decisions:
  - "Allocation percentage defaults to 0% when no allocation exists (empty gauge)"
  - "Latest reading date replaces well.updatedAt for well list display"

patterns-established:
  - "Batch query hooks returning Map<id, T> for O(1) lookup in rendering loops"
  - "Guard empty PowerSync queries with 'SELECT NULL WHERE 0' pattern"

requirements-completed: [WELL-10, WELL-11]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 16 Plan 02: Reading Management & Map Integration Summary

**Real allocation gauge on map markers via useCurrentAllocations hook, and actual reading dates on well list via useLatestReadings hook**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T19:53:24Z
- **Completed:** 2026-02-19T19:56:52Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Map marker gauge now shows real allocation usage percentage instead of hardcoded 100%
- Well list page shows actual latest reading date per well instead of well.updatedAt
- Two new batch query hooks with memoized Map results for efficient O(1) lookups
- Wells without allocations show empty gauge (0%); wells without readings show "No readings"

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCurrentAllocations hook and update WellMarker + MapView** - `3d448b7` (feat)
2. **Task 2: Create useLatestReadings hook and update WellListPage** - `d0e2e17` (feat)

## Files Created/Modified
- `src/hooks/useCurrentAllocations.ts` - Batch query hook returning Map<wellId, WellAllocationSummary> for current allocations
- `src/hooks/useLatestReadings.ts` - Batch query hook returning Map<wellId, isoTimestamp> for latest readings
- `src/components/WellMarker.tsx` - Added allocationPercentage prop, removed hardcoded 100%
- `src/components/MapView.tsx` - Added farmId prop, calls useCurrentAllocations and passes data to markers
- `src/pages/DashboardPage.tsx` - Passes farmId to MapView
- `src/pages/WellListPage.tsx` - Uses useLatestReadings instead of well.updatedAt for display dates

## Decisions Made
- Allocation percentage defaults to 0% when no allocation exists (empty gauge is clearer than full gauge)
- Latest reading date fully replaces well.updatedAt -- wells without readings show "No readings" correctly
- Both hooks use single-query batch patterns with memoized Maps for performance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in WellDetailSheet.tsx (unrelated to this plan) -- logged to deferred-items.md

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both hooks provide reactive data via PowerSync queries
- Map markers and well list now display live allocation and reading data
- Ready for any further reading management or reporting features

## Self-Check: PASSED

- All 6 files verified present on disk
- Commit `3d448b7` verified in git log
- Commit `d0e2e17` verified in git log

---
*Phase: 16-reading-management-map-integration*
*Completed: 2026-02-19*
