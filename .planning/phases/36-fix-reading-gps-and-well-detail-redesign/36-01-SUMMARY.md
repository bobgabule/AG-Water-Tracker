---
phase: 36-fix-reading-gps-and-well-detail-redesign
plan: 01
subsystem: ui
tags: [react, gps, geolocation, tailwind, well-detail, gauge, readings]

# Dependency graph
requires:
  - phase: 32-unified-design-system
    provides: design tokens (bg-surface-dark, bg-btn-confirm, text-btn-confirm-text)
provides:
  - Fixed GPS capture with 10s timeout and 60s cache reuse
  - isSimilar flag preserved through GPS failure and range-warning views
  - Green-body Well Detail page with white text and alternating row backgrounds
  - Unit-aware gauge labels (Gallons/Cubic Feet/AF)
  - Last Updated timestamp in well detail header
affects: [well-detail, new-reading, gauge]

# Tech tracking
tech-stack:
  added: []
  patterns: [pendingSimilar state for cross-view flag preservation, formatRelativeDate helper for relative timestamps]

key-files:
  created: []
  modified:
    - src/components/NewReadingSheet.tsx
    - src/components/WellDetailSheet.tsx
    - src/components/WellDetailHeader.tsx
    - src/components/WellUsageGauge.tsx
    - src/components/WellReadingsList.tsx

key-decisions:
  - "GPS timeout 10s + maximumAge 60s matches AddWellFormBottomSheet and LocationPickerBottomSheet patterns"
  - "pendingSimilar state preserves isSimilar through gps-failed and range-warning views including Retry"
  - "formatRelativeDate uses Today/Yesterday/MonthDay pattern for Last Updated display"

patterns-established:
  - "pendingSimilar pattern: store boolean flag in state before async GPS capture, forward to all exit paths"

requirements-completed: []

# Metrics
duration: 6min
completed: 2026-02-25
---

# Phase 36 Plan 01: Fix Reading GPS and Well Detail Redesign Summary

**Fixed GPS capture (10s timeout + 60s cache), preserved isSimilar flag across view transitions, and redesigned Well Detail page with green body, white text, unit-aware gauge labels, and Last Updated timestamp**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-25T16:28:43Z
- **Completed:** 2026-02-25T16:34:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- GPS capture now uses 10s timeout with 60s maximumAge for cache reuse -- no more "GPS Unavailable" during normal field use
- isSimilar flag preserved via pendingSimilar state through gps-failed, range-warning, and retry flows
- Well Detail page fully green (bg-surface-dark) with white text, alternating row backgrounds, and yellow out-of-range flags
- Gauge labels dynamically show Gallons/Cubic Feet/AF based on well.units
- Last Updated timestamp shows relative date (Today/Yesterday/Mon Day) below well name in header
- New Reading button uses bg-btn-confirm styling consistent with design system

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix GPS capture and isSimilar flag in NewReadingSheet** - `7411f26` (fix)
2. **Task 2: Redesign Well Detail page** - `a61bca0` (feat)

## Files Created/Modified
- `src/components/NewReadingSheet.tsx` - GPS timeout fix (5s to 10s + 60s cache), pendingSimilar state for isSimilar preservation
- `src/components/WellDetailSheet.tsx` - Green body, confirm button, lastReadingDate prop, unitLabel prop to gauge
- `src/components/WellDetailHeader.tsx` - formatRelativeDate helper, lastReadingDate prop, Last Updated display
- `src/components/WellUsageGauge.tsx` - unitLabel prop, getUnitDisplayName helper, dynamic label rendering
- `src/components/WellReadingsList.tsx` - White text, alternating bg-white/5 rows, yellow flags, "No available readings" empty state

## Decisions Made
- GPS timeout 10s + maximumAge 60s matches patterns in AddWellFormBottomSheet and LocationPickerBottomSheet for consistency
- pendingSimilar state stores isSimilar before async GPS capture and forwards to all save paths including Retry
- formatRelativeDate uses Today/Yesterday/Month Day pattern for human-readable timestamps

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Retry button losing isSimilar flag**
- **Found during:** Task 1 (GPS fix)
- **Issue:** Retry button in gps-failed view called `handleGpsCaptureAndSave()` without args, resetting pendingSimilar to false
- **Fix:** Changed to `handleGpsCaptureAndSave(pendingSimilar)` to preserve the flag through retries
- **Files modified:** src/components/NewReadingSheet.tsx
- **Verification:** TypeScript check passes, retry now forwards stored flag
- **Committed in:** 7411f26 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential bug fix for correctness -- without it, retrying GPS after similar reading would lose the similar flag. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Well Detail page fully redesigned with green theme and functional GPS capture
- Ready for any further UI polish or feature additions to the well detail flow

---
*Phase: 36-fix-reading-gps-and-well-detail-redesign*
*Completed: 2026-02-25*
