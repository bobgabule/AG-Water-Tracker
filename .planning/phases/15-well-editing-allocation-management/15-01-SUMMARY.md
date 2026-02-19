---
phase: 15-well-editing-allocation-management
plan: 01
subsystem: database, api, ui
tags: [supabase, powersync, zustand, rls, validation, usage-calculation]

# Dependency graph
requires:
  - phase: 12-data-foundation
    provides: "readings and allocations tables (migration 031), PowerSync schema"
  - phase: 14-record-meter-reading
    provides: "readings recording flow using value field"
provides:
  - "starting_reading column on allocations for baseline usage calculation"
  - "Relaxed wells UPDATE/DELETE RLS (all farm members, not admin-only)"
  - "Usage calculation utility (calculateUsageAf) with unit conversion to AF"
  - "Well name and WMIS uniqueness validation functions"
  - "Zustand draft store for well edit form state persistence"
affects: [15-02-PLAN, 15-03-PLAN, allocation-management, well-editing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Usage calculation: reading diff * multiplier * unit conversion to AF", "Zustand draft store for form round-trip persistence"]

key-files:
  created:
    - supabase/migrations/032_well_edit_allocation_schema.sql
    - src/lib/usage-calculation.ts
    - src/stores/wellEditDraftStore.ts
  modified:
    - src/lib/powersync-schema.ts
    - src/lib/validation.ts

key-decisions:
  - "starting_reading stored as column.text in PowerSync (matches allocated_af, used_af, value TEXT pattern for decimal precision)"
  - "Wells UPDATE/DELETE RLS relaxed to all farm members via get_user_farm_ids (matching INSERT and allocations pattern)"

patterns-established:
  - "Usage formula: (latest - starting) * multiplier * CONVERSION_TO_AF[units]"
  - "Well uniqueness validation: case-insensitive trim comparison with excludeId for self-exclusion"
  - "Draft store pattern: Zustand store with set/clear for form state persistence across navigation"

requirements-completed: [ALLOC-05, EDIT-01]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 15 Plan 01: Data Layer Foundation Summary

**Starting reading column, relaxed wells RLS, AF usage calculation utility, well uniqueness validation, and Zustand edit draft store**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T11:14:05Z
- **Completed:** 2026-02-19T11:15:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Migration 032 adds starting_reading column to allocations and relaxes wells UPDATE/DELETE RLS from admin-only to all farm members
- Usage calculation utility converts meter reading differences to acre-feet through multiplier and unit conversion
- Well name and WMIS uniqueness validation with case-insensitive comparison and self-exclusion
- Zustand draft store persists well edit form state across navigation to allocations page

## Task Commits

Each task was committed atomically:

1. **Task 1: Supabase migration and PowerSync schema update** - `928cd63` (feat)
2. **Task 2: Usage calculation utility, validation additions, and draft store** - `8fb58d3` (feat)

## Files Created/Modified
- `supabase/migrations/032_well_edit_allocation_schema.sql` - Adds starting_reading column to allocations, relaxes wells UPDATE/DELETE RLS
- `src/lib/powersync-schema.ts` - Added starting_reading: column.text to allocations TableV2
- `src/lib/usage-calculation.ts` - AF conversion constants, multiplier resolution, and calculateUsageAf function
- `src/lib/validation.ts` - Added isWellNameUnique and isWmisUnique functions
- `src/stores/wellEditDraftStore.ts` - Zustand store for well edit form draft persistence

## Decisions Made
- starting_reading stored as column.text in PowerSync to match the existing TEXT pattern for decimal precision (allocated_af, used_af, value)
- Wells UPDATE/DELETE RLS relaxed to all farm members via get_user_farm_ids(), matching the pattern already used for INSERT (migration 018) and allocations (migration 031)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer complete: starting_reading column, usage calculation, validation, and draft store ready for Plans 02 and 03
- Plan 02 can build the well edit form using wellEditDraftStore and validation functions
- Plan 03 can build the allocation management page using calculateUsageAf and starting_reading column

## Self-Check: PASSED

All 6 files verified present. Both task commits (928cd63, 8fb58d3) verified in git log.

---
*Phase: 15-well-editing-allocation-management*
*Completed: 2026-02-19*
