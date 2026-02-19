---
phase: 14-record-meter-reading
plan: 02
subsystem: ui
tags: [react, powersync, headless-ui, bottom-sheet, meter-problem, checkboxes]

# Dependency graph
requires:
  - phase: 14-record-meter-reading
    plan: 01
    provides: "NewReadingSheet with Reading tab, toast notification system, state machine view pattern"
  - phase: 13-well-detail-page
    provides: "WellDetailSheet component, WellDetailPage route, Dialog/sheet patterns"
provides:
  - "Meter Problem tab with 4 checkboxes updating well status fields via PowerSync"
  - "+ New Reading button on well detail page opening NewReadingSheet"
  - "Complete end-to-end reading and meter problem flow"
affects: [15-well-editing, 16-reading-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Checkbox-to-field mapping pattern for meter problem reporting", "Conditional sheet rendering with prop drilling through page -> detail -> reading sheet"]

key-files:
  created: []
  modified:
    - src/components/NewReadingSheet.tsx
    - src/components/WellDetailSheet.tsx
    - src/pages/WellDetailPage.tsx

key-decisions:
  - "Meter problems directly update well status fields (pump_state, battery_state, meter_status) via PowerSync UPDATE"
  - "Dead Pump overwrites Pump Off when both checked (severity precedence)"
  - "NewReadingSheet rendered conditionally (mount/unmount) rather than always-mounted with open prop"

patterns-established:
  - "Meter problem checkbox mapping: UI checkboxes -> field/value pairs -> dynamic UPDATE SET clause"
  - "Sheet integration: page owns open state, detail sheet triggers via callback, reading sheet conditionally rendered"

requirements-completed: [PROB-01, PROB-02, READ-01]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 14 Plan 02: Record Meter Reading Summary

**Meter Problem tab with 4 status checkboxes and "+ New Reading" button wiring the complete reading flow into the well detail page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T03:36:00Z
- **Completed:** 2026-02-19T03:39:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Meter Problem tab with 4 checkboxes (Not Working, Battery Dead, Pump Off, Dead Pump) mapping to well status fields
- Problem submission updates wells table via PowerSync with dynamic SET clause and severity precedence
- "+ New Reading" button added to WellDetailSheet footer opening the NewReadingSheet
- WellDetailPage manages sheet open/close state with conditional rendering
- Full end-to-end flow verified: reading input, validation, warnings, GPS capture, meter problem reporting, toast notifications

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Meter Problem tab and wire "+ New Reading" button** - `c424156` (feat)
2. **Task 2: Visual verification of complete reading flow** - Human checkpoint approved (no commit)

## Files Created/Modified
- `src/components/NewReadingSheet.tsx` - Added MeterProblemForm with 4 checkboxes, submit logic with dynamic UPDATE wells SET clause, submitting state
- `src/components/WellDetailSheet.tsx` - Added onNewReading callback prop and "+ New Reading" fixed footer button with PlusIcon
- `src/pages/WellDetailPage.tsx` - Added readingSheetOpen state, handleNewReading/handleReadingClose callbacks, conditional NewReadingSheet rendering

## Decisions Made
- Meter problems directly update well status fields via PowerSync UPDATE (no separate problems table)
- Dead Pump overwrites Pump Off when both are checked -- severity precedence applied in order
- NewReadingSheet conditionally rendered (mount on open, unmount on close) for clean state reset

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 14 complete: full reading recording and meter problem reporting flow operational
- Phase 15 (Well Editing & Allocation Management) can proceed -- well detail page provides edit button navigation point
- Phase 16 (Reading Management & Map Integration) can proceed after Phase 15 -- reading history list provides edit/delete interaction points
- PowerSync Dashboard sync rules still need manual update for farm_readings and farm_allocations buckets (carried forward from Phase 12)

## Self-Check: PASSED

- All 3 modified files verified present on disk
- Commit hash c424156 verified in git log
- SUMMARY.md file created successfully

---
*Phase: 14-record-meter-reading*
*Completed: 2026-02-19*
