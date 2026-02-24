---
phase: 24-loading-state-collapse-skeleton-screens
plan: 01
subsystem: ui
tags: [skeleton, shimmer, powersync, loading, sign-out, performance]

# Dependency graph
requires:
  - phase: 23-route-level-code-splitting-bundle-optimization
    provides: Suspense boundaries and lazy-loaded routes for skeleton fallbacks
provides:
  - Reusable skeleton primitive components (SkeletonLine, SkeletonBlock, SkeletonCircle)
  - Shimmer CSS animation utility
  - Non-blocking PowerSync provider (app shell renders immediately)
  - usePowerSyncStatus hook for loading state detection
  - Instant sign-out with background cleanup
affects: [24-02-PLAN, 27-query-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns: [non-blocking-provider, background-cleanup, skeleton-primitives]

key-files:
  created:
    - src/components/skeletons/SkeletonPrimitives.tsx
  modified:
    - src/index.css
    - src/lib/PowerSyncContext.tsx
    - src/components/AppLayout.tsx
    - src/lib/AuthProvider.tsx

key-decisions:
  - "Split AppLayoutContent into shell (Header+SideMenu) vs PowerSync-gated content for instant app shell rendering"
  - "Use PowerSyncGate component to show skeleton during init instead of full-screen spinner"
  - "Non-blocking error banner at bottom instead of blocking error modal for PowerSync failures"
  - "Sign-out clears React state immediately, runs Supabase+PowerSync cleanup in background IIFE"

patterns-established:
  - "Skeleton primitives: SkeletonLine/Block/Circle with relative overflow-hidden + absolute animate-shimmer overlay"
  - "Non-blocking provider pattern: render children always, gate PowerSync-dependent content with usePowerSyncStatus"
  - "Background cleanup pattern: clear UI state first for instant redirect, then async cleanup in IIFE"

requirements-completed: [LOAD-01, LOAD-02, LOAD-07]

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 24 Plan 01: Skeleton Primitives & Non-Blocking PowerSync Summary

**Shimmer skeleton primitives, non-blocking PowerSync provider rendering app shell instantly, and sub-500ms sign-out with background cleanup**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-24T14:35:54Z
- **Completed:** 2026-02-24T14:40:44Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created three reusable skeleton primitive components (SkeletonLine, SkeletonBlock, SkeletonCircle) with animated shimmer effect
- Made PowerSync initialization non-blocking so the app shell (Header + SideMenu) renders immediately while database initializes
- Fixed sign-out delay from ~2 seconds to near-instant by clearing React state before async cleanup
- Added usePowerSyncStatus hook for components to detect PowerSync loading state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create skeleton primitives and shimmer animation** - `1cd4429` (feat)
2. **Task 2: Non-blocking PowerSync provider and fast sign-out** - `a901272` (feat)

## Files Created/Modified
- `src/components/skeletons/SkeletonPrimitives.tsx` - Three skeleton primitive components (SkeletonLine, SkeletonBlock, SkeletonCircle) with shimmer animation
- `src/index.css` - Added @keyframes shimmer and .animate-shimmer utility class
- `src/lib/PowerSyncContext.tsx` - Removed blocking loading screen, always renders children, non-blocking error banner
- `src/components/AppLayout.tsx` - Split into shell (instant) + PowerSyncGate (skeleton during loading) + PowerSyncContent (after init)
- `src/lib/AuthProvider.tsx` - Sign-out clears state immediately, background IIFE for Supabase/PowerSync cleanup

## Decisions Made
- Split AppLayoutContent into three parts: the shell (Header+SideMenu) renders without any PowerSync dependency, PowerSyncGate shows skeletons during loading, and PowerSyncContent renders once db is available. This avoids the useQuery context requirement while keeping the app shell interactive.
- Used a non-blocking error banner (fixed to bottom) instead of a full-screen error modal for PowerSync init failures. This keeps the app shell visible and navigable even when the database fails to initialize.
- Sign-out uses a fire-and-forget IIFE pattern for Supabase and PowerSync cleanup. State is cleared synchronously first for instant redirect, and the 2-second Promise.race timeout was removed entirely.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Skeleton primitives are ready for page-specific skeleton screens in plan 24-02
- usePowerSyncStatus hook available for RequireRole skeleton fallback in 24-02
- PowerSyncGate pattern establishes the ContentSkeleton placeholder that 24-02 will enhance with page-specific variants

## Self-Check: PASSED

All 5 files verified present. Both task commits (1cd4429, a901272) verified in git log.

---
*Phase: 24-loading-state-collapse-skeleton-screens*
*Completed: 2026-02-24*
