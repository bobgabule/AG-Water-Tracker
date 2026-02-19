---
phase: 14-record-meter-reading
plan: 01
subsystem: ui
tags: [react, zustand, powersync, headless-ui, geolocation, toast, bottom-sheet]

# Dependency graph
requires:
  - phase: 12-data-foundation
    provides: "PowerSync readings table schema, gps-proximity utilities, useWellReadings hook"
  - phase: 13-well-detail-page
    provides: "WellDetailSheet pattern, useGeolocation hook, Dialog/sheet patterns"
provides:
  - "Toast notification system (toastStore + Toast component mounted globally)"
  - "NewReadingSheet component with complete Reading tab (form, validation, warnings, GPS, PowerSync INSERT)"
affects: [14-02, well-detail-page, meter-problem-reporting]

# Tech tracking
tech-stack:
  added: []
  patterns: ["State machine view pattern for multi-step forms (form -> warning -> submitting)", "Global toast via Zustand + fixed-position component"]

key-files:
  created:
    - src/stores/toastStore.ts
    - src/components/Toast.tsx
    - src/components/NewReadingSheet.tsx
  modified:
    - src/components/AppLayout.tsx

key-decisions:
  - "Toast auto-dismiss after 3s with tap-to-dismiss fallback"
  - "State machine views (form/similar-warning/range-warning/submitting) for linear reading submission flow"
  - "GPS captured fresh on each submit via navigator.geolocation (not cached hook) for accuracy"

patterns-established:
  - "Toast pattern: Zustand store with show(message, type?) / hide(), global Toast component in AppLayout"
  - "Multi-step bottom sheet: view state machine with typed union for form flow control"

requirements-completed: [READ-01, READ-02, READ-03, READ-04, PROX-02]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 14 Plan 01: Record Meter Reading Summary

**Toast notification system and NewReadingSheet with numeric input, validation, similar-reading warning, GPS proximity check, and PowerSync INSERT**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T03:28:46Z
- **Completed:** 2026-02-19T03:31:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Global toast notification system with success/error variants, auto-dismiss, and tap-to-dismiss
- NewReadingSheet bottom sheet at z-[60] with Reading and Meter Problem tabs
- Numeric input with decimal keypad, unit/multiplier display, and positive number validation
- Similar reading warning (within 5 units) with go-back/continue flow
- Fresh GPS capture on submit with out-of-range proximity warning
- PowerSync INSERT with all required fields (id, well_id, farm_id, value, recorded_by, recorded_at, gps coords, is_in_range)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create toast notification system** - `56c548b` (feat)
2. **Task 2: Create NewReadingSheet with complete Reading tab** - `172db36` (feat)

## Files Created/Modified
- `src/stores/toastStore.ts` - Zustand store for toast notifications with show/hide and 3s auto-dismiss
- `src/components/Toast.tsx` - Fixed-position toast with success (green) and error (red) variants
- `src/components/NewReadingSheet.tsx` - Bottom sheet with Reading tab: numeric input, validation, warnings, GPS capture, PowerSync save
- `src/components/AppLayout.tsx` - Added Toast component mount after main content

## Decisions Made
- Toast auto-dismisses after 3 seconds with tap-to-dismiss as fallback -- simple UX for field agents
- Used state machine view pattern (form/similar-warning/range-warning/submitting) for predictable multi-step flow
- GPS captured fresh via navigator.geolocation on each submit (5s timeout) rather than using cached hook value -- ensures accuracy at time of recording
- Reading value stored as trimmed string (TEXT column in PowerSync) to preserve decimal precision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Toast system available globally for any component via useToastStore
- NewReadingSheet ready to be opened from WellDetailSheet (integration in Plan 02)
- Meter Problem tab placeholder ready for Plan 02 implementation
- All PowerSync INSERT fields match readings table schema from Phase 12

## Self-Check: PASSED

- All 4 files verified present on disk
- Both commit hashes (56c548b, 172db36) verified in git log
- TypeScript compilation: zero errors

---
*Phase: 14-record-meter-reading*
*Completed: 2026-02-19*
