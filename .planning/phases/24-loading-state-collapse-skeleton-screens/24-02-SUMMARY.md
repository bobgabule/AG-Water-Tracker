---
phase: 24-loading-state-collapse-skeleton-screens
plan: 02
subsystem: ui
tags: [skeleton, loading, fade-transition, powersync, react]

# Dependency graph
requires:
  - phase: 24-loading-state-collapse-skeleton-screens
    plan: 01
    provides: SkeletonLine/Block/Circle primitives with shimmer animation, usePowerSyncStatus hook
provides:
  - Page-specific skeleton screens for Dashboard, Well List, and Well Detail
  - RequireRole skeleton fallback prop for role-loading states
  - Fade transition pattern (~200ms opacity) from skeleton to content
affects: [27-query-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns: [skeleton-to-content-fade, page-specific-skeletons, skeleton-fallback-prop]

key-files:
  created:
    - src/components/skeletons/DashboardSkeleton.tsx
    - src/components/skeletons/WellListSkeleton.tsx
    - src/components/skeletons/WellDetailSkeleton.tsx
  modified:
    - src/pages/DashboardPage.tsx
    - src/pages/WellListPage.tsx
    - src/pages/WellDetailPage.tsx
    - src/components/RequireRole.tsx

key-decisions:
  - "Use requestAnimationFrame delay before fade-in to allow DOM to paint skeleton before transitioning"
  - "DashboardPage shows skeleton only when useWells loading is true; cached data skips skeleton automatically"
  - "RequireRole fallback prop is optional and backward-compatible -- existing usages unchanged"

patterns-established:
  - "Skeleton-to-content fade: useState(!loading) + useEffect with rAF + transition-opacity duration-200"
  - "Page skeleton pattern: if (loading) return <PageSkeleton />; with fade wrapper on real content"

requirements-completed: [LOAD-03, LOAD-04, LOAD-05, LOAD-06]

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 24 Plan 02: Page-Specific Skeleton Screens Summary

**Dashboard, Well List, and Well Detail skeleton screens with fade transitions replacing spinners and blank loading states**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T14:44:24Z
- **Completed:** 2026-02-24T14:48:04Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created three page-specific skeleton components that mirror actual page layouts with animated shimmer placeholders
- Replaced WellListPage spinner with structured skeleton rows matching real well list layout
- Added DashboardPage skeleton with map placeholder, crosshair overlay, and FAB outlines
- Added WellDetailPage skeleton with header, metrics grid, action buttons, and reading rows
- Updated RequireRole to accept optional fallback prop for skeleton display during role resolution
- Implemented ~200ms opacity fade transition from skeleton to real content on all three pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create page-specific skeleton screens** - `dbae1e5` (feat)
2. **Task 2: Wire skeletons into pages, RequireRole, and add fade transitions** - `25cc4a9` (feat)

## Files Created/Modified
- `src/components/skeletons/DashboardSkeleton.tsx` - Full-viewport map placeholder with centered crosshair and floating action button outlines
- `src/components/skeletons/WellListSkeleton.tsx` - Title, search bar, and 6 animated well row placeholders matching WellListPage layout
- `src/components/skeletons/WellDetailSkeleton.tsx` - Header, metrics grid, action buttons, and reading row placeholders matching WellDetailSheet layout
- `src/pages/DashboardPage.tsx` - Added loading detection from useWells, skeleton return, and fade transition wrapper
- `src/pages/WellListPage.tsx` - Replaced spinner with WellListSkeleton, added fade transition
- `src/pages/WellDetailPage.tsx` - Added loading detection, WellDetailSkeleton during load, fade transition
- `src/components/RequireRole.tsx` - Added optional fallback prop for skeleton display while role loads

## Decisions Made
- Used `requestAnimationFrame` delay before setting `showContent` to true, allowing the DOM to paint the real content before the opacity transition begins. This prevents a flash of unstyled content.
- DashboardPage shows skeleton only when `useWells().loading` is true. Since PowerSync caches data locally, returning users will see cached data immediately (loading=false), naturally skipping the skeleton on subsequent visits.
- RequireRole's `fallback` prop is optional and backward-compatible. Existing RequireRole usages in App.tsx continue to render null while loading. The prop is available for future use when page-specific skeletons should be shown during role resolution.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 24 loading state improvements are complete (plans 01 and 02)
- Skeleton primitives + page-specific skeletons provide complete loading UX coverage
- Ready for Phase 25+ performance work

## Self-Check: PASSED

All 7 files verified present. Both task commits (dbae1e5, 25cc4a9) verified in git log.

---
*Phase: 24-loading-state-collapse-skeleton-screens*
*Completed: 2026-02-24*
