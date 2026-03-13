---
phase: 43-super-admin-farm-isolation
plan: 02
subsystem: ui
tags: [react, zustand, powersync, super-admin, farm-scoping]

# Dependency graph
requires:
  - phase: 43-01
    provides: useActiveFarm hook with super_admin override, FarmSelector component
provides:
  - Super_admin-only farm name indicators on Add Well and Add User forms
  - WellAllocationsPage null farmId guard preventing broken state
  - Reading write path audit confirmation (correct farm scoping via useActiveFarm)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Super_admin-only UI indicators gated by role === 'super_admin' check"
    - "Null farmId early return guard pattern for pages with write operations"

key-files:
  created: []
  modified:
    - src/components/AddWellFormBottomSheet.tsx
    - src/components/AddUserModal.tsx
    - src/pages/WellAllocationsPage.tsx

key-decisions:
  - "Farm name indicators use hardcoded English strings (super_admin is internal-only)"
  - "WellAllocationsPage uses activeFarmId directly instead of fallback to empty string"
  - "Early return guard placed after all hooks to comply with React rules of hooks"

patterns-established:
  - "Super_admin indicator pattern: role === 'super_admin' && farmName && <indicator>"
  - "Null farmId guard: if (!activeFarmId) return <no farm selected UI>"

requirements-completed: [SC-3, SC-4, SC-6]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 43 Plan 02: Write Form Farm Indicators and Null FarmId Fix Summary

**Super_admin-only farm name indicators on Add Well and Add User forms, WellAllocationsPage null farmId guard, and reading write path audit confirming correct farm scoping**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T06:28:04Z
- **Completed:** 2026-03-13T06:30:25Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AddWellFormBottomSheet shows "Adding to: [Farm Name]" only when user is super_admin
- AddUserModal shows "Inviting to: [Farm Name]" only when user is super_admin
- WellAllocationsPage no longer converts null farmId to empty string -- shows "No farm selected" guard
- Reading write path audit confirmed: farmId flows from useActiveFarm() through WellDetailPage prop to NewReadingSheet INSERT, correctly scoped to the active farm

## Task Commits

Each task was committed atomically:

1. **Task 1: Super_admin-only farm name indicators on write forms** - `4036f61` (feat)
2. **Task 2: Fix WellAllocationsPage null farmId bug and audit reading write path** - `6ea636a` (fix)

## Files Created/Modified
- `src/components/AddWellFormBottomSheet.tsx` - Added useUserRole import, gated farm name display to super_admin only with "Adding to:" prefix
- `src/components/AddUserModal.tsx` - Added useUserRole import, added "Inviting to: [Farm Name]" indicator for super_admin in header
- `src/pages/WellAllocationsPage.tsx` - Removed null-to-empty-string farmId fallback, replaced with direct activeFarmId usage, added early return guard for null farmId

## Decisions Made
- Farm name indicators use hardcoded English strings (super_admin is internal-only, per CONTEXT.md)
- WellAllocationsPage uses activeFarmId directly instead of fallback to empty string
- Early return guard placed after all hooks to comply with React rules of hooks

## Reading Write Path Audit

Confirmed the complete reading write path for correct farm scoping:

1. **WellDetailPage.tsx line 17:** `const { farmId: activeFarmId } = useActiveFarm()` -- for super_admin returns the override farm
2. **WellDetailPage.tsx line 59:** `{readingSheetOpen && currentWell && user && farmId && (` -- guards rendering when no farm selected
3. **NewReadingSheet.tsx line 21:** `farmId: string` -- required prop in interface
4. **NewReadingSheet.tsx lines 148-155:** `INSERT INTO readings (... farm_id ...)` with `farmId` at farm_id column position
5. **No secondary farmId source** -- single flow: useActiveFarm() -> WellDetailPage prop -> NewReadingSheet INSERT

This confirms SC-3: "Adding a reading creates exactly 1 record for the selected farm."

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 43 is now complete (2/2 plans done)
- All super_admin farm isolation features implemented: FarmSelector, farm-scoped operations, null guards, and UI indicators
- Ready for any follow-up phases

---
*Phase: 43-super-admin-farm-isolation*
*Completed: 2026-03-13*
