# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** v2.0 Milestone -- Phase 12: Data Foundation

## Current Position

Phase: 12 of 16 (Data Foundation)
Plan: --
Status: Ready to plan
Last activity: 2026-02-19 -- v2.0 roadmap created (Phases 12-16)

Progress: [###########░░░░░░░░░] 55% (28/~TBD plans -- v1.0+v1.1 complete, v2.0 not yet planned)

## Performance Metrics

**Velocity:**
- Total plans completed: 28 (25 v1.0 + 3 v1.1)
- Average duration: 5min
- Total execution time: ~2.0 hours

**By Phase (previous milestones):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-session-stability | 5 | 21min | 4min |
| 02-offline-session-resilience | 3 | 18min | 6min |
| 03-role-foundation | 4 | 14min | 4min |
| 04-permission-enforcement | 4 | 9min | 2min |
| 05-grower-onboarding | 2 | 6min | 3min |
| 06-invite-system | 2 | 16min | 8min |
| 07-user-management | 2 | 5min | 3min |
| 08-subscription-gating | 3 | 9min | 3min |
| 09-map-default-view | 1 | ~5min | 5min |
| 10-location-permission-flow | 1 | ~5min | 5min |
| 11-dashboard-quality-fixes | 1 | 2min | 2min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**v2.0 decisions:**
- [v2.0]: Readings are raw cumulative meter values (not usage amounts)
- [v2.0]: Period-based allocations with flexible start/end dates, multiple per well
- [v2.0]: GPS proximity = display + flag, does NOT block recording
- [v2.0]: Meter problems directly update well status fields (pump_state, battery_state, meter_status)
- [v2.0]: Usage auto-calculated from readings within allocation period + manually overridable
- [v2.0]: Well edit form is separate full-page form (not reuse of create bottom sheet)
- [v2.0]: Similar reading warning (within 5 units) = warning, not blocker
- [v2.0]: Anyone with well access can set allocations (not restricted to grower/admin)
- [v2.0]: Reading edit/delete restricted to grower/admin
- [v2.0]: Meter values stored as TEXT in PowerSync (not REAL) to preserve decimal precision
- [v2.0]: GPS proximity via @turf/distance (client-side Haversine), not server-side

### Pending Todos

- [04-03]: PowerSync Dashboard sync rules for farms table need manual verification for super_admin cross-farm access
- [v1.0 tech debt]: Custom Access Token Hook needs manual enablement in Supabase Dashboard
- [v1.0 tech debt]: PowerSync Dashboard sync rules need manual verification for invited_first_name/invited_last_name

### Blockers/Concerns

- v2.0 requires new database tables (readings, allocations) -- tables were DROPPED in migration 013 and never recreated
- PowerSync schema and sync rules need updates for new tables
- Allocation schema changed from year-only to period-based -- confirm before implementing

## Session Continuity

Last session: 2026-02-19
Stopped at: Phase 12 context gathered -- ready to plan
Resume file: .planning/phases/12-data-foundation/12-CONTEXT.md
