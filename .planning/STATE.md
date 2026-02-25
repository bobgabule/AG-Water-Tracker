# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** Phase 30 — Drop Dead Invite Code

## Current Position

Phase: 30
Plan: 1 of 1 (30-01 complete)
Status: Phase 30 complete
Last activity: 2026-02-25 — Phase 30 Plan 01 complete

Progress: Phase 30: ██████████ 100% (1/1 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 60 (25 v1.0 + 3 v1.1 + 12 v2.0 + 9 v3.0 + 6 v4.0 + 2 v4.1 + 2 P27 + 1 P30)
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
| v4.1 Fixes | 28-29 | 2 | 2026-02-25 |

**Recent Executions:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 23 P01 | 3min | 2 | 5 |
| Phase 24 P01 | 5min | 2 | 5 |
| Phase 24 P02 | 4min | 2 | 7 |
| Phase 25 P01 | 3min | 2 | 3 |
| Phase 26 P01 | 2min | 2 | 2 |
| Phase 28 P01 | 3min | 4 | 2 |
| Phase 29 P01 | 3min | 3 | 3 |
| Phase 27 P01 | 6min | 2 | 12 |
| Phase 27 P02 | 2min | 2 | 2 |
| Phase 30 P01 | 2min | 2 | 2 |

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
- Phase 27-01: navigate(-1) cannot accept viewTransition option in React Router v7 numeric overload
- Phase 27-01: PhonePage.tsx included in viewTransition updates for full codebase coverage
- Phase 27-02: Sync failure handling moved entirely to PowerSync connector -- DashboardPage only handles rare local INSERT errors
- Phase 27-02: Removed saveError state and error banner in favor of unified toast notification system
- Phase 27-02: wellFailureNotified flag ensures only one toast per transaction batch even with multiple well ops
- Phase 30-01: Used DROP FUNCTION IF EXISTS for idempotent, safe-to-rerun migration

### Pending Todos (manual steps)

- PowerSync Dashboard sync rules need updating with `farm_readings` and `farm_allocations` buckets
- Custom Access Token Hook needs manual enablement in Supabase Dashboard
- PowerSync Dashboard sync rules need verification for invited_first_name/invited_last_name

### Roadmap Evolution

- Phase 30 added: Drop dead invite code
- Phase 31 added: Simplify invite user flow with seat limits
- Phase 32 added: Unified design system and theme colors

### Blockers/Concerns

None currently.

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 30-01-PLAN.md
Resume file: —
Next action: Phase 30 complete — proceed to Phase 31
