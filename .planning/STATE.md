# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-24)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** v4.0 Performance & Perceived Speed — Phase 23 complete

## Current Position

Phase: 23 of 27 (Route-Level Code Splitting & Bundle Optimization)
Plan: 2 of 2 (complete)
Status: Phase complete
Last activity: 2026-02-24 — Phase 23 plans 01 and 02 executed

Progress: ####################---- 10% (v4.0)

## Performance Metrics

**Velocity:**
- Total plans completed: 51 (25 v1.0 + 3 v1.1 + 12 v2.0 + 9 v3.0 + 2 v4.0)
- Average duration: ~4min
- Total execution time: ~2.5 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 MVP | 1-8 | 25 | 2026-02-10 to 2026-02-11 |
| v1.1 Dashboard & Map | 9-11 | 3 | 2026-02-12 |
| v2.0 Meter Readings | 12-16 | 12 | 2026-01-31 to 2026-02-19 |
| v3.0 Subscriptions | 17-22 | 9 | 2026-02-22 to 2026-02-23 |
| v4.0 Performance | 23-27 | 2 | 2026-02-24 (started) |

**Recent Executions:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 23 P01 | 3min | 2 | 5 |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (31 decisions).

- Phase 23-01: LazyRoute helper component wraps each route in per-route LazyErrorBoundary + Suspense
- Phase 23-01: Removed PowerSync manual chunk per CONTEXT decisions -- Vite handles naturally
- Phase 23-01: Added tiles.mapbox.com and events.mapbox.com preconnect (runtime requests, not CDN)
- Phase 23-02: Add prefetched entries to Set before import() call to prevent concurrent duplicate fetches
- Phase 23-02: Keep touch prefetch immediate (no debounce) since touch indicates user commitment
- Phase 23-02: Mark both routes in prefetched set upfront in prefetchOnMenuOpen to prevent races

### Pending Todos (manual steps)

- PowerSync Dashboard sync rules need updating with `farm_readings` and `farm_allocations` buckets
- Custom Access Token Hook needs manual enablement in Supabase Dashboard
- PowerSync Dashboard sync rules need verification for invited_first_name/invited_last_name

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-02-24
Stopped at: Phase 24 context gathered
Resume file: .planning/phases/24-loading-state-collapse-skeleton-screens/24-CONTEXT.md
Next action: /gsd:plan-phase 24
