---
phase: 16-reading-management-map-integration
plan: 01
subsystem: ui
tags: [react, headlessui, powersync, crud, bottom-sheet]

# Dependency graph
requires:
  - phase: 14-record-meter-reading
    provides: "Readings table, PowerSync schema, NewReadingSheet pattern"
  - phase: 15-well-editing-allocation-management
    provides: "ConfirmDeleteWellDialog pattern, WellDetailSheet structure"
provides:
  - "EditReadingSheet component for editing meter reading values"
  - "ConfirmDeleteReadingDialog component for delete confirmation"
  - "Tappable reading rows in WellReadingsList"
affects: [16-02, reading-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Conditional row element (button vs div) based on handler prop"]

key-files:
  created:
    - src/components/EditReadingSheet.tsx
    - src/components/ConfirmDeleteReadingDialog.tsx
  modified:
    - src/components/WellReadingsList.tsx
    - src/components/WellDetailSheet.tsx

key-decisions:
  - "EditReadingSheet rendered as centered card dialog (z-[60]) above WellDetailSheet (z-50), not a bottom sheet"
  - "Conditional row element pattern: button when onReadingClick provided, div when not (backwards compatible)"

patterns-established:
  - "Conditional interactive row: Row = onReadingClick ? 'button' : 'div' with spread props"
  - "Nested dialog pattern: EditReadingSheet contains ConfirmDeleteReadingDialog"

requirements-completed: [READ-05, READ-06]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 16 Plan 01: Reading Edit/Delete Summary

**Tap-to-edit reading rows with EditReadingSheet (PowerSync UPDATE) and ConfirmDeleteReadingDialog (PowerSync DELETE) wired into WellDetailSheet**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T19:53:22Z
- **Completed:** 2026-02-19T19:56:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- EditReadingSheet with pre-filled value, validation, save (UPDATE), and delete flow
- ConfirmDeleteReadingDialog matching ConfirmDeleteWellDialog pattern with loading state
- Reading rows in WellReadingsList become tappable buttons when handler provided
- WellDetailSheet wires reading tap to open EditReadingSheet with correct well context

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ConfirmDeleteReadingDialog and EditReadingSheet components** - `4d08fab` (feat)
2. **Task 2: Make reading rows tappable and wire into WellDetailSheet** - `da957d7` (feat)

## Files Created/Modified
- `src/components/ConfirmDeleteReadingDialog.tsx` - Confirmation dialog for reading deletion with red warning icon and loading state
- `src/components/EditReadingSheet.tsx` - Centered card dialog for editing reading value with save/cancel/delete buttons
- `src/components/WellReadingsList.tsx` - Added onReadingClick prop, conditional button/div rows with tap affordance
- `src/components/WellDetailSheet.tsx` - Added selectedReading state, handleReadingClick/handleEditClose handlers, EditReadingSheet rendering

## Decisions Made
- EditReadingSheet uses centered card layout (not bottom sheet) to visually differentiate from WellDetailSheet underneath
- Conditional row element pattern (button vs div) preserves backwards compatibility for any other WellReadingsList consumers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Reading edit/delete UI complete and wired into well detail flow
- Ready for Phase 16 Plan 02 (map integration or remaining reading management features)
- PowerSync reactive queries automatically update the readings list after edit/delete

## Self-Check: PASSED

- FOUND: src/components/ConfirmDeleteReadingDialog.tsx
- FOUND: src/components/EditReadingSheet.tsx
- FOUND: src/components/WellReadingsList.tsx (modified)
- FOUND: src/components/WellDetailSheet.tsx (modified)
- FOUND: commit 4d08fab (Task 1)
- FOUND: commit da957d7 (Task 2)

---
*Phase: 16-reading-management-map-integration*
*Completed: 2026-02-19*
