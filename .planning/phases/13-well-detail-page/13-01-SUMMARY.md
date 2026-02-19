---
phase: 13-well-detail-page
plan: 01
subsystem: ui
tags: [react, headless-ui, react-swipeable, gestures, turf, proximity]

# Dependency graph
requires:
  - phase: 12-data-foundation
    provides: wells table schema, useWells hook, @turf/distance
provides:
  - /wells/:id route with WellDetailPage
  - WellDetailSheet slide-up Dialog with swipe gestures
  - WellDetailHeader with metadata and status indicators
  - WellStatusIndicators equipment status chips
  - useWellProximityOrder hook for geographic well ordering
affects: [13-02-PLAN, 13-03-PLAN]

# Tech tracking
tech-stack:
  added: [react-swipeable@7.0.2]
  patterns: [slide-up Dialog sheet, swipe gesture navigation, proximity-ordered well cycling]

key-files:
  created:
    - src/pages/WellDetailPage.tsx
    - src/components/WellDetailSheet.tsx
    - src/components/WellDetailHeader.tsx
    - src/components/WellStatusIndicators.tsx
    - src/hooks/useWellProximityOrder.ts
  modified:
    - src/App.tsx
    - package.json

key-decisions:
  - "Used duration-300 (closest built-in) instead of duration-350 for sheet slide animation"
  - "Dialog uses static prop to prevent backdrop dismiss per user decision"
  - "Proximity ordering returns current well at index 0, then nearest-to-farthest"

patterns-established:
  - "Sheet pattern: Headless UI Dialog with DialogBackdrop + DialogPanel for full-page slide-up sheets"
  - "Swipe navigation: useSwipeable on header div for dismiss (down >80px) and well cycling (left/right)"
  - "Cross-fade transition: transitioning state with 150ms opacity toggle for well switching"

requirements-completed: [WELL-01, WELL-02, WELL-04, WELL-08, WELL-09]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 13 Plan 01: Well Detail Sheet Foundation Summary

**Slide-up well detail sheet with Headless UI Dialog, swipe gestures for dismiss/well-cycling via react-swipeable, and pinned header showing metadata and equipment status indicators**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T09:54:51Z
- **Completed:** 2026-02-19T09:57:41Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Route /wells/:id added inside AppLayout, accessible from map well marker taps
- WellDetailSheet renders a full-page Dialog covering 90% viewport with dark scrim and slide-up animation
- Swipe-down dismisses sheet, swipe-left/right cycles through proximity-ordered wells with cross-fade
- WellDetailHeader displays farm name, well name, serial/WMIS/last-updated, and status chips
- WellStatusIndicators shows Pump/Battery/Meter state with icon/color mapping (Ok=green, Low=yellow, Critical/Dead=red, Unknown=gray)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-swipeable, add route, create WellDetailPage + WellDetailSheet + useWellProximityOrder** - `935a425` (feat)
2. **Task 2: Create WellDetailHeader and WellStatusIndicators components** - `7761d12` (feat)

## Files Created/Modified
- `src/pages/WellDetailPage.tsx` - Route page component extracting params and wiring navigation callbacks
- `src/components/WellDetailSheet.tsx` - Full-page slide-up Dialog with swipe handlers and cross-fade transitions
- `src/components/WellDetailHeader.tsx` - Pinned header with back/edit buttons, well metadata, and status indicators
- `src/components/WellStatusIndicators.tsx` - Equipment status chips with icon/color state mapping
- `src/hooks/useWellProximityOrder.ts` - Wells ordered by geographic distance from current well using @turf/distance
- `src/App.tsx` - Added /wells/:id route and WellDetailPage import
- `package.json` - Added react-swipeable dependency

## Decisions Made
- Used `duration-300` for the sheet slide animation (closest built-in Tailwind value to the specified ~350ms)
- Dialog uses `static` prop with `onClose={() => {}}` to prevent backdrop tap from dismissing the sheet (per user decision)
- Proximity ordering places current well at index 0, remaining wells sorted nearest-to-farthest, with wrap-around navigation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sheet foundation complete with all navigation mechanics (back, edit, swipe dismiss, swipe between wells)
- Ready for Plan 02 to add content sections (readings, allocations) inside the scrollable content area
- WellDetailSheet has placeholder content div awaiting Plan 02 components

## Self-Check: PASSED

- All 5 created files verified on disk
- Commit `935a425` verified in git log
- Commit `7761d12` verified in git log
- TypeScript compilation: zero errors

---
*Phase: 13-well-detail-page*
*Completed: 2026-02-19*
