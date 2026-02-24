---
phase: 23-route-level-code-splitting-bundle-optimization
plan: 01
subsystem: ui
tags: [code-splitting, lazy-loading, suspense, error-boundary, vite, rollup, preconnect]

# Dependency graph
requires:
  - phase: 21-login-only-auth-flow
    provides: lazy-loaded auth pages and route structure
provides:
  - Per-route Suspense + LazyErrorBoundary wrapping every lazy page
  - PageLoader with fullScreen prop and 150ms show delay
  - LazyErrorBoundary with ChunkLoadError detection, offline awareness, auto-retry, reload loop prevention
  - Readable Vite chunk filenames (name-[hash].js pattern)
  - Mapbox GL JS isolated in its own manual chunk
  - Preconnect/dns-prefetch hints for all external services
affects: [23-02-PLAN, performance-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-route-suspense-boundary, lazy-error-boundary-with-chunk-detection, delayed-loading-spinner]

key-files:
  created: []
  modified:
    - src/components/PageLoader.tsx
    - src/components/LazyErrorBoundary.tsx
    - src/App.tsx
    - vite.config.ts
    - index.html

key-decisions:
  - "Per-route LazyRoute helper component instead of inline wrapping for consistency"
  - "Removed PowerSync manual chunk per CONTEXT.md decision -- Vite handles naturally"
  - "Added tiles.mapbox.com and events.mapbox.com preconnect (runtime external requests) instead of CDN preconnect"

patterns-established:
  - "LazyRoute wrapper: each lazy page gets its own LazyErrorBoundary key={routePath} + Suspense"
  - "PageLoader fullScreen=true for auth/standalone pages, default for in-app content area"
  - "ChunkLoadError detection via error name and message pattern matching with auto-retry + reload loop prevention"

requirements-completed: [SPLIT-01, SPLIT-02, SPLIT-03, SPLIT-04, ASSET-03]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 23 Plan 01: Code Splitting Infrastructure Summary

**Per-route Suspense boundaries with ChunkLoadError-aware error handling, Mapbox chunk isolation, and resource hints for all external services**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T12:25:19Z
- **Completed:** 2026-02-24T12:28:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Every lazy-loaded page wrapped in its own Suspense + LazyErrorBoundary with route-keyed auto-reset
- Auth pages load independently from Mapbox GL JS (PhonePage 2.82 kB vs mapbox chunk 1705 kB)
- PageLoader shows spinner after 150ms delay with fade-in, supports fullScreen and content-area modes
- LazyErrorBoundary detects ChunkLoadError, retries silently once, auto-reloads with loop prevention, and handles offline state
- Readable chunk filenames in build output (DashboardPage-[hash].js, mapbox-[hash].js, vendor-[hash].js)
- Complete preconnect/dns-prefetch coverage: Supabase, PowerSync, api.mapbox.com, tiles.mapbox.com, events.mapbox.com

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance PageLoader and LazyErrorBoundary components** - `d165bbc` (feat)
2. **Task 2: Wire per-route Suspense/error boundaries, Vite chunks, resource hints** - `77d9e6a` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/PageLoader.tsx` - Suspense fallback with fullScreen prop, 150ms delay, fade-in transition
- `src/components/LazyErrorBoundary.tsx` - Error boundary with ChunkLoadError detection, offline awareness, auto-retry, reload loop prevention
- `src/App.tsx` - Per-route LazyRoute wrapper around every lazy page, auth routes use fullScreen loader
- `vite.config.ts` - Added chunkFileNames, removed PowerSync manual chunk, kept Mapbox isolation
- `index.html` - Added preconnect + dns-prefetch for tiles.mapbox.com and events.mapbox.com

## Decisions Made
- Created `LazyRoute` helper component in App.tsx to consistently wrap each route in LazyErrorBoundary + Suspense, avoiding repetitive inline JSX
- Removed PowerSync manual chunk per CONTEXT.md decision ("Mapbox only -- no manual chunking for PowerSync or Supabase") -- Vite's natural chunking handles PowerSync modules well
- Added tiles.mapbox.com and events.mapbox.com as meaningful runtime preconnect targets instead of a JS CDN (Mapbox GL JS is bundled via npm, not loaded from CDN)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in SideMenu.tsx (unused imports from routePrefetch) were present before execution. These are out of scope for this plan and did not block execution. They resolved on subsequent tsc runs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Code splitting infrastructure complete, ready for Plan 02 (prefetch strategy)
- All 13 pages are lazy-loaded with per-route boundaries
- Mapbox GL JS chunk is isolated and only loads on map pages

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit d165bbc (Task 1) found in git log
- Commit 77d9e6a (Task 2) found in git log
- TypeScript compilation passes
- Vite build succeeds with correct chunk structure

---
*Phase: 23-route-level-code-splitting-bundle-optimization*
*Completed: 2026-02-24*
