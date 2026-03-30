---
phase: 47-meter-replacement-clean-data-architecture
plan: 01
subsystem: data-layer
tags: [migration, powersync, usage-calculation, readings, meter-replacement, type-column]

# Dependency graph
requires:
  - phase: 14-record-meter-reading
    provides: readings INSERT, usage calculation
  - phase: 15-well-editing-allocation-management
    provides: allocation CRUD, auto-calc useEffect
  - phase: 16-reading-management-map-integration
    provides: reading delete, ReadingDetailPage
provides:
  - type column on readings table (reading | meter_replacement)
  - PowerSync schema with type field on readings
  - calculateAllocationUsage() centralized segment-based calculation
  - Reading hooks with type field (useWellReadings, useWellReadingsWithNames)
  - NewReadingSheet using full recalc instead of additive delta
  - ReadingDetailPage with recalculation on delete
  - WellAllocationsPage using centralized calc for auto-calc
affects: [meter-replacement-ui, reading-history, well-detail, reporting]

# Tech tracking
tech-stack:
  added: []
  patterns: [segment-based-usage-calculation, meter-replacement-boundaries]

key-files:
  created:
    - supabase/migrations/049_add_reading_type.sql
  modified:
    - src/lib/powersync-schema.ts
    - src/lib/usage-calculation.ts
    - src/hooks/useWellReadings.ts
    - src/hooks/useWellReadingsWithNames.ts
    - src/components/NewReadingSheet.tsx
    - src/pages/ReadingDetailPage.tsx
    - src/pages/WellAllocationsPage.tsx

key-decisions:
  - "Segment-based algorithm processes entries newest-first, using meter_replacement as segment boundaries"
  - "INSERT includes explicit type='reading' column for forward compatibility"
  - "Delete recalculation uses PowerSync (not Supabase) for consistency with local-first pattern"
  - "Hide delete button for meter_replacement readings to protect data integrity"

patterns-established:
  - "calculateAllocationUsage: single function for all usage calculation across allocation periods"
  - "Meter replacement entries as segment boundaries in usage calculation"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 47 Plan 01: Data Layer Summary

**Added type column to readings, centralized segment-based calculateAllocationUsage() function, and replaced 3 scattered calculation locations with unified meter-replacement-aware recalculation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T01:54:08Z
- **Completed:** 2026-03-30T01:59:00Z
- **Tasks:** 7 code tasks + 1 manual step
- **Files modified:** 7

## Accomplishments
- Migration 049 adds `type` column to readings table with CHECK constraint (reading | meter_replacement)
- Centralized `calculateAllocationUsage()` handles meter replacement segment boundaries
- All 3 usage calculation locations (NewReadingSheet, ReadingDetailPage, WellAllocationsPage) now use the unified function
- Reading hooks expose `type` field for downstream components

## Task Commits

Each task was committed atomically:

1. **Task 1.1: Supabase Migration** - `22a4ee9` (chore)
2. **Task 1.2: PowerSync Schema** - `1c809d8` (feat)
3. **Task 1.3: Centralized Calculation** - `ec1eaac` (feat)
4. **Task 1.4: Hook Updates** - `eed3611` (feat)
5. **Task 1.5: NewReadingSheet** - `84302ff` (feat)
6. **Task 1.6: ReadingDetailPage** - `77cab08` (feat)
7. **Task 1.7: WellAllocationsPage** - `d1f15a7` (feat)

## Files Created/Modified
- `supabase/migrations/049_add_reading_type.sql` - ALTER TABLE adds type column with CHECK constraint
- `src/lib/powersync-schema.ts` - Added type: column.text to readings definition
- `src/lib/usage-calculation.ts` - Added calculateAllocationUsage() segment-based function
- `src/hooks/useWellReadings.ts` - Added type to SELECT, Reading interface, and mapping
- `src/hooks/useWellReadingsWithNames.ts` - Added type to SELECT, both interfaces, and mapping
- `src/components/NewReadingSheet.tsx` - Replaced additive delta with full recalc, added type to INSERT
- `src/pages/ReadingDetailPage.tsx` - Added recalculation on delete, hide delete for meter_replacements
- `src/pages/WellAllocationsPage.tsx` - Replaced simple calc with centralized function

## Decisions Made
- Segment-based algorithm processes entries newest-first; meter_replacement entries split segments with their value as the newer segment's baseline
- INSERT explicitly includes `type='reading'` for new readings (forward compatible)
- Delete recalculation uses PowerSync's `db.execute`/`db.getAll` (not Supabase client) for consistency with existing local-first patterns
- Hide delete button for meter_replacement readings to protect usage calculation integrity

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added type column to readings INSERT statement**
- **Found during:** Task 1.5 (NewReadingSheet)
- **Issue:** Plan didn't mention updating the INSERT statement to include the new type column
- **Fix:** Added 'reading' as explicit type value in INSERT VALUES
- **Files modified:** src/components/NewReadingSheet.tsx
- **Verification:** TypeScript compiles, INSERT includes all schema columns
- **Committed in:** 84302ff (Task 1.5 commit)

**2. [Rule 2 - Missing Critical] Added delete recalculation to ReadingDetailPage**
- **Found during:** Task 1.6 (ReadingDetailPage)
- **Issue:** Worktree didn't have Phase 45 recalculation fix (bb943ba was on master). Plan assumed existing recalculation block to replace.
- **Fix:** Added complete recalculation logic using calculateAllocationUsage after delete
- **Files modified:** src/pages/ReadingDetailPage.tsx
- **Verification:** TypeScript compiles, delete handler includes full recalc flow
- **Committed in:** 77cab08 (Task 1.6 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Manual Step Required

**Task 1.8: PowerSync Dashboard** - Add `type` to the readings bucket SELECT in PowerSync Dashboard sync rules. This is a manual dashboard configuration step.

## Issues Encountered
None

## Next Phase Readiness
- Data layer complete for meter replacement feature
- Plan 02 can build the meter replacement UI flow on top of this foundation
- PowerSync Dashboard needs `type` column added to readings sync rules (manual step)

## Self-Check: PASSED

All 8 created/modified files verified present. All 7 task commit hashes verified in git log.

---
*Phase: 47-meter-replacement-clean-data-architecture*
*Completed: 2026-03-30*
