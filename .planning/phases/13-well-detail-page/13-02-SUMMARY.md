---
phase: 13-well-detail-page
plan: 02
subsystem: ui
tags: [react, powersync, tailwind, geolocation, gauge, readings]

# Dependency graph
requires:
  - phase: 13-well-detail-page/01
    provides: WellDetailSheet shell with header, swipe gestures, proximity ordering
  - phase: 12-data-foundation
    provides: readings/allocations PowerSync schema, useWellReadings, useWellAllocations, gps-proximity utils
provides:
  - WellUsageGauge component with color-coded horizontal bar
  - WellReadingsList component with user name resolution and GPS indicators
  - useWellReadingsWithNames hook (LEFT JOIN farm_members for recorder names)
  - Fully wired WellDetailSheet with allocation data, readings history, GPS proximity
affects: [13-well-detail-page/03, reading-recording, allocation-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [LEFT JOIN for name resolution in PowerSync queries, conditional proximity display without auto-requesting GPS]

key-files:
  created:
    - src/components/WellUsageGauge.tsx
    - src/components/WellReadingsList.tsx
    - src/hooks/useWellReadingsWithNames.ts
  modified:
    - src/components/WellDetailSheet.tsx

key-decisions:
  - "GPS proximity uses autoRequest: false -- does not prompt for location, only displays if previously granted"
  - "Current allocation found by date range match (periodStart <= today <= periodEnd) with fallback to most recent"

patterns-established:
  - "LEFT JOIN farm_members for user name resolution in PowerSync queries"
  - "Conditional rendering of GPS proximity (only when userLocation is non-null)"

requirements-completed: [WELL-03, WELL-05, WELL-06, WELL-07, READ-07, PROX-01]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 13 Plan 02: Well Detail Content Summary

**Usage gauge with color-coded fill bar, readings history with LEFT JOIN name resolution, and GPS proximity indicator wired into WellDetailSheet**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T02:00:51Z
- **Completed:** 2026-02-19T02:02:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- WellUsageGauge renders horizontal bar with green/yellow/red color thresholds based on usage percentage
- WellReadingsList shows compact card rows with date, time, value, recorder name, and yellow GPS indicator for out-of-range readings
- useWellReadingsWithNames resolves recorded_by user IDs to display names via LEFT JOIN against farm_members
- WellDetailSheet wired with allocation data, readings history, and GPS proximity display

## Task Commits

Each task was committed atomically:

1. **Task 1: Create WellUsageGauge, WellReadingsList, and useWellReadingsWithNames** - `1ff3f0a` (feat)
2. **Task 2: Wire content sections and GPS proximity into WellDetailSheet** - `116acb6` (feat)

## Files Created/Modified
- `src/hooks/useWellReadingsWithNames.ts` - Enhanced readings query with LEFT JOIN to farm_members for recorder names
- `src/components/WellUsageGauge.tsx` - Horizontal stacked bar gauge with allocated/used/remaining and color thresholds
- `src/components/WellReadingsList.tsx` - Scrollable readings history with user names, dates, values, and GPS indicators
- `src/components/WellDetailSheet.tsx` - Updated to render real content sections replacing placeholder

## Decisions Made
- GPS proximity uses `autoRequest: false` so the well detail page does not trigger location permission prompts -- it only shows proximity if the user previously granted access (e.g., from the map's location FAB)
- Current allocation is found by checking if today falls within `periodStart..periodEnd`, with fallback to the most recent allocation if no match

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Well detail content sections are complete and rendering real data
- Ready for Plan 03 (actions: record reading, edit well, manage allocations)
- PowerSync Dashboard sync rules for farm_readings/farm_allocations buckets still need manual setup (existing known blocker)

## Self-Check: PASSED

- [x] src/hooks/useWellReadingsWithNames.ts exists (64 lines)
- [x] src/components/WellUsageGauge.tsx exists (54 lines)
- [x] src/components/WellReadingsList.tsx exists (76 lines)
- [x] src/components/WellDetailSheet.tsx exists (179 lines)
- [x] Commit 1ff3f0a found
- [x] Commit 116acb6 found
- [x] TypeScript compilation passes with zero errors

---
*Phase: 13-well-detail-page*
*Completed: 2026-02-19*
