---
phase: 12-data-foundation
plan: 02
subsystem: hooks
tags: [react-hooks, powersync, gps, turf, proximity, offline-sync]

# Dependency graph
requires:
  - phase: 12-data-foundation
    provides: "PowerSync schema with readings/allocations tables, ReadingRow/AllocationRow types"
  - phase: 03-role-foundation
    provides: "wells table with WellLocation interface"
provides:
  - "useWellReadings(wellId) query hook returning typed readings with boolean conversion"
  - "useWellAllocations(wellId) query hook returning typed allocations with boolean conversion"
  - "getDistanceToWell(userCoords, wellCoords) GPS distance utility returning feet"
  - "isInRange(distanceFeet) proximity threshold check against 500ft"
  - "PROXIMITY_THRESHOLD_FEET constant (500)"
affects: [13-meter-reading-flow, 14-well-detail-readings, 15-allocation-management, 16-dashboard-analytics]

# Tech tracking
tech-stack:
  added: ["@turf/distance ^7.3.4"]
  patterns:
    - "Query hook pattern: wellId guard with SELECT NULL WHERE 0, useQuery<RowType>, useMemo mapping with boolean conversion"
    - "GPS proximity: client-side Haversine via @turf/distance with feet units, separate distance calc from threshold check"

key-files:
  created:
    - src/hooks/useWellReadings.ts
    - src/hooks/useWellAllocations.ts
    - src/lib/gps-proximity.ts
  modified: []

key-decisions:
  - "Used nullish coalescing (?? '') for PowerSync text columns that TypeScript types as string|null but are NOT NULL in database"
  - "GPS proximity split into getDistanceToWell (calculation) and isInRange (threshold) for reuse flexibility"
  - "WellCoords interface uses latitude/longitude naming to match WellLocation from useWells.ts"

patterns-established:
  - "Query hook return shape: { items, loading, error } with useMemo mapping on [data] dependency"
  - "Boolean conversion pattern: row.field === 1 for PowerSync INTEGER 0/1 columns"
  - "GPS coordinate ordering: [longitude, latitude] for GeoJSON convention with @turf"

requirements-completed: [WELL-03, WELL-05, WELL-10, WELL-11, READ-03, READ-04, READ-07, PROX-01, PROX-02, ALLOC-02, ALLOC-05, ALLOC-06]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 12 Plan 02: Query Hooks & GPS Proximity Summary

**useWellReadings/useWellAllocations PowerSync query hooks with memoized boolean conversion, plus @turf/distance GPS proximity utility with 500ft threshold**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T00:23:32Z
- **Completed:** 2026-02-19T00:26:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created useWellReadings hook that queries readings by wellId, sorts by recorded_at DESC, and converts is_in_range from integer to boolean
- Created useWellAllocations hook that queries allocations by wellId, sorts by period_start DESC, and converts is_manual_override from integer to boolean
- Created gps-proximity utility module with getDistanceToWell (Haversine via @turf/distance in feet) and isInRange (500ft threshold check)
- Installed @turf/distance v7.3.4 as production dependency

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useWellReadings and useWellAllocations query hooks** - `2b0a58b` (feat)
2. **Task 2: Create GPS proximity utility** - `47eba13` (feat)

## Files Created/Modified
- `src/hooks/useWellReadings.ts` - PowerSync query hook returning Reading[] with boolean is_in_range conversion, memoized with useMemo
- `src/hooks/useWellAllocations.ts` - PowerSync query hook returning Allocation[] with boolean is_manual_override conversion, memoized with useMemo
- `src/lib/gps-proximity.ts` - Pure utility module: getDistanceToWell (feet via @turf/distance), isInRange (500ft threshold), PROXIMITY_THRESHOLD_FEET constant
- `package.json` - Added @turf/distance ^7.3.4 dependency

## Decisions Made
- Used nullish coalescing (`?? ''`) for required string fields when mapping from PowerSync row types (which are `string | null` due to column.text) to hook interface types (which are `string`). These columns are NOT NULL in Supabase, so null is only a TypeScript type-level concern.
- Split GPS proximity into separate `getDistanceToWell` (distance calculation) and `isInRange` (threshold check) functions for reuse flexibility -- UI components may want to display the distance even when out of range.
- Named `WellCoords` interface with `latitude`/`longitude` to match the existing `WellLocation` interface shape from `useWells.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type mismatch between PowerSync row types and hook interfaces**
- **Found during:** Task 1 (useWellReadings and useWellAllocations)
- **Issue:** PowerSync `ReadingRow` and `AllocationRow` types define text columns as `string | null`, but hook interfaces declare required fields as `string`. Direct property assignment caused TS2322 errors.
- **Fix:** Added nullish coalescing (`?? ''`) on all required string field mappings. These columns are NOT NULL in the Supabase schema, so null values never occur in practice.
- **Files modified:** src/hooks/useWellReadings.ts, src/hooks/useWellAllocations.ts
- **Verification:** `npx tsc -b --noEmit` passes clean
- **Committed in:** `2b0a58b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary type safety fix. No scope creep.

## Issues Encountered
None beyond the type mismatch documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All v2.0 data access hooks are complete: useWellReadings, useWellAllocations
- GPS proximity utility ready for meter reading flow (Phase 13) proximity checks
- Data foundation (Phase 12) fully complete -- Phases 13-16 can build UI on top of these hooks and utilities
- PowerSync Dashboard sync rules still need manual configuration (documented in 12-01-SUMMARY.md)

## Self-Check: PASSED

- All 4 files verified present on disk (useWellReadings.ts, useWellAllocations.ts, gps-proximity.ts, 12-02-SUMMARY.md)
- Commit `2b0a58b` (Task 1) verified in git log
- Commit `47eba13` (Task 2) verified in git log

---
*Phase: 12-data-foundation*
*Completed: 2026-02-19*
