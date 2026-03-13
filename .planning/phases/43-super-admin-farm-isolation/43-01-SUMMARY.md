---
phase: 43-super-admin-farm-isolation
plan: 01
subsystem: ui
tags: [react, zustand, farm-selector, super-admin, empty-state]

# Dependency graph
requires:
  - phase: 32-design-system
    provides: surface-header color tokens and design system
provides:
  - FarmSelector auto-select with hydration guard for super_admin
  - Deleted-farm fallback to first available farm
  - No-farms empty state label in FarmSelector
  - No-farms empty state in DashboardPage
  - Disabled Add Well FAB when no farm selected
affects: [43-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zustand persist hydration guard pattern for effects that depend on rehydrated state
    - useActiveFarmStore.getState() inside effects to avoid dependency loops

key-files:
  created: []
  modified:
    - src/components/FarmSelector.tsx
    - src/pages/DashboardPage.tsx

key-decisions:
  - "Read overrideFarmId via getState() inside effect to avoid dependency loops on override changes"
  - "Auto-select effect depends on [hydrated, role, options] only — intentionally excludes overrideFarmId"
  - "No-farms label uses static div (not Listbox) since there are no options to select"

patterns-established:
  - "Zustand persist hydration guard: useState(store.persist.hasHydrated()) + useEffect onFinishHydration subscription"

requirements-completed: [SC-1, SC-2, SC-5]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 43 Plan 01: Auto-Select Farm Summary

**FarmSelector auto-select with hydration guard, deleted-farm fallback, no-farms empty states on header and dashboard**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-13T06:22:01Z
- **Completed:** 2026-03-13T06:24:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Super admin auto-selects first alphabetical farm on login, guarded by Zustand persist hydration
- Deleted-farm fallback silently selects first available farm when persisted farm no longer exists
- "No available farms" label shown in header when no farms exist
- "No farms created yet." centered empty state on dashboard for super_admin with no farmId
- Add Well FAB greyed out and non-interactive when no farm is selected

## Task Commits

Each task was committed atomically:

1. **Task 1: FarmSelector auto-select with hydration guard, deleted-farm fallback, and no-farms label** - `a032b6e` (feat)
2. **Task 2: DashboardPage no-farms empty state and disabled FAB** - `cf65aff` (feat)

## Files Created/Modified
- `src/components/FarmSelector.tsx` - Added hydration guard, auto-select effect, deleted-farm fallback, no-farms label
- `src/pages/DashboardPage.tsx` - Added no-farms empty state for super_admin, disabled FAB when no farmId

## Decisions Made
- Read overrideFarmId via `getState()` inside effect to avoid dependency loops — only `hydrated`, `role`, and `options` trigger re-runs
- No-farms label renders a static `<div>` instead of the Listbox component since there are no options to interact with
- Defensive guard added at top of `handleNewWell` as belt-and-suspenders alongside the disabled button

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FarmSelector and DashboardPage handle all edge cases for super_admin farm selection
- Ready for 43-02 plan (write operation auditing and farm context indicators)

## Self-Check: PASSED

All files exist. All commits verified (a032b6e, cf65aff).

---
*Phase: 43-super-admin-farm-isolation*
*Completed: 2026-03-13*
