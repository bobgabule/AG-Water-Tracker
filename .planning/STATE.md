# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** v4.1 Readings & Allocations Fixes

## Current Position

Phase: 28 of 29 (not started)
Plan: 0 of ? (not started)
Status: Milestone v4.1 started — executing
Last activity: 2026-02-25 — Milestone v4.1 started

Progress: ░░░░░░░░░░ 0% (v4.1)

## Performance Metrics

**Velocity:**
- Total plans completed: 55 (25 v1.0 + 3 v1.1 + 12 v2.0 + 9 v3.0 + 6 v4.0)
- Average duration: ~4min
- Total execution time: ~2.5 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 MVP | 1-8 | 25 | 2026-02-10 to 2026-02-11 |
| v1.1 Dashboard & Map | 9-11 | 3 | 2026-02-12 |
| v2.0 Meter Readings | 12-16 | 12 | 2026-01-31 to 2026-02-19 |
| v3.0 Subscriptions | 17-22 | 9 | 2026-02-22 to 2026-02-23 |
| v4.0 Performance | 23-27 | 6 | 2026-02-24 to 2026-02-25 |
| v4.1 Fixes | 28-29 | 0 | 2026-02-25 |

**Recent Executions:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 23 P01 | 3min | 2 | 5 |
| Phase 24 P01 | 5min | 2 | 5 |
| Phase 24 P02 | 4min | 2 | 7 |
| Phase 25 P01 | 3min | 2 | 3 |
| Phase 26 P01 | 2min | 2 | 2 |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (31 decisions).

- Phase 23-01: LazyRoute helper component wraps each route in per-route LazyErrorBoundary + Suspense
- Phase 23-01: Removed PowerSync manual chunk per CONTEXT decisions -- Vite handles naturally
- Phase 23-01: Added tiles.mapbox.com and events.mapbox.com preconnect (runtime requests, not CDN)
- Phase 23-02: Add prefetched entries to Set before import() call to prevent concurrent duplicate fetches
- Phase 23-02: Keep touch prefetch immediate (no debounce) since touch indicates user commitment
- Phase 23-02: Mark both routes in prefetched set upfront in prefetchOnMenuOpen to prevent races
- Phase 24-01: Split AppLayoutContent into shell (Header+SideMenu) vs PowerSync-gated content for instant app shell rendering
- Phase 24-01: Non-blocking error banner at bottom instead of blocking error modal for PowerSync failures
- Phase 24-01: Sign-out clears React state immediately, runs Supabase+PowerSync cleanup in background IIFE
- Phase 24-02: Use requestAnimationFrame delay before fade-in to allow DOM to paint before transitioning
- Phase 24-02: DashboardPage skeleton only when useWells loading is true; cached data skips skeleton
- Phase 24-02: RequireRole fallback prop is optional and backward-compatible
- Phase 25-01: WebP quality 45 produces 229KB output -- 97% reduction from 11MB JPEG with acceptable visual quality under gradient overlay
- Phase 25-01: Moved image from public/ to src/assets/ so Vite bundles it with AuthLayout chunk via ES module import
- Phase 26-01: Fade-out banner uses delayed unmount (500ms) matching CSS transition duration for smooth animation
- Phase 26-01: Phone input and submit button both disabled when offline -- prevents form interaction entirely

### Pending Todos (manual steps)

- PowerSync Dashboard sync rules need updating with `farm_readings` and `farm_allocations` buckets
- Custom Access Token Hook needs manual enablement in Supabase Dashboard
- PowerSync Dashboard sync rules need verification for invited_first_name/invited_last_name

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-02-25
Stopped at: v4.1 milestone started, executing phases
Resume file: —
Next action: Execute Phase 28 (reading/validation fixes)
