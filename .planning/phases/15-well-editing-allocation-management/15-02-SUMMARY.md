---
phase: 15-well-editing-allocation-management
plan: 02
subsystem: ui, database
tags: [react, powersync, zustand, headlessui, react-router, useBlocker, form-editing]

# Dependency graph
requires:
  - phase: 15-well-editing-allocation-management
    plan: 01
    provides: "Well uniqueness validation, draft store, relaxed wells RLS"
  - phase: 12-data-foundation
    provides: "readings and allocations tables, PowerSync schema"
provides:
  - "WellEditPage full-page form with pre-fill, save, delete, useBlocker"
  - "ConfirmDeleteWellDialog with cascade delete (readings -> allocations -> well)"
  - "Route /wells/:id/edit registered in App.tsx"
affects: [15-03-PLAN, allocation-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["useBlocker for unsaved changes protection with inline discard dialog", "Draft store bypass pattern: navigatingToAllocationsRef to skip blocker on allocations nav", "Cascade delete via writeTransaction for local SQLite FK workaround"]

key-files:
  created:
    - src/pages/WellEditPage.tsx
    - src/components/ConfirmDeleteWellDialog.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Delete well uses writeTransaction cascade (readings -> allocations -> well) since PowerSync local SQLite does not enforce FK cascades"
  - "Allocation nav saves draft to Zustand store and uses ref flag to bypass useBlocker instead of resetting isDirty"

patterns-established:
  - "Full-page edit form pattern: useRef init guard prevents re-initialization on well data updates"
  - "Blocker bypass: navigatingToAllocationsRef.current checked in useBlocker condition"
  - "Inline discard dialog: rendered conditionally when blocker.state === 'blocked'"

requirements-completed: [EDIT-01, EDIT-02, EDIT-03]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 15 Plan 02: Well Edit Form Summary

**Full-page well edit form with pre-fill from data/draft, PowerSync UPDATE/DELETE, useBlocker unsaved changes protection, and allocation count link with draft persistence**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T11:18:57Z
- **Completed:** 2026-02-19T11:22:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- WellEditPage renders at /wells/:id/edit with all well fields pre-filled from existing data or draft store
- Save validates name/WMIS uniqueness (excluding self), updates well via PowerSync UPDATE, navigates back with toast
- Cascade delete removes readings, allocations, and well in a single writeTransaction
- useBlocker + beforeunload protects against losing unsaved changes with discard confirmation dialog
- Allocation count link saves form state to draft store before navigating, bypassing the blocker

## Task Commits

Each task was committed atomically:

1. **Task 1: WellEditPage with full form, save, GPS, allocation link, and route** - `cd19cb3` (feat)
2. **Task 2: Delete well with cascade and confirmation dialog** - `ba5745b` (feat)

## Files Created/Modified
- `src/pages/WellEditPage.tsx` - Full-page well edit form with pre-fill, save, delete, useBlocker, draft store integration
- `src/components/ConfirmDeleteWellDialog.tsx` - Delete well confirmation dialog matching ConfirmDeleteMemberDialog pattern
- `src/App.tsx` - Added /wells/:id/edit route with WellEditPage import

## Decisions Made
- Delete well uses writeTransaction cascade (readings -> allocations -> well) since PowerSync local SQLite does not enforce FK cascades
- Allocation nav saves draft to Zustand store and uses ref flag to bypass useBlocker instead of resetting isDirty
- ConfirmDeleteWellDialog created as part of Task 1 to avoid circular import compilation issues, committed separately as Task 2

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Well edit form complete with all CRUD operations (update + delete)
- Plan 03 can build the allocation management page, navigable from the edit form's allocation link
- Draft store integration tested: form state persists across navigation to/from allocations page

## Self-Check: PASSED

All 3 files verified present. Both task commits (cd19cb3, ba5745b) verified in git log.

---
*Phase: 15-well-editing-allocation-management*
*Completed: 2026-02-19*
