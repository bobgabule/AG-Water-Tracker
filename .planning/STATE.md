# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-19)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** v2.0 Milestone -- Phase 13: Well Detail Page

## Current Position

Phase: 13 of 16 (Well Detail Page) -- In progress
Plan: 2 of 3
Status: Plan 02 complete, ready for Plan 03
Last activity: 2026-02-19 -- Phase 13 Plan 02 executed

Progress: [##############░░░░░░] 66% (32/~TBD plans -- v1.0+v1.1 complete, v2.0 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 32 (25 v1.0 + 3 v1.1 + 4 v2.0)
- Average duration: 5min
- Total execution time: ~2.1 hours

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
| 12-data-foundation | 2/2 | 6min | 3min |

*Updated after each plan completion*
| Phase 12 P01 | 3min | 2 tasks | 4 files |
| Phase 12 P02 | 3min | 2 tasks | 3 files |
| 13-well-detail-page | 2/3 | 5min | 3min |

*Updated after each plan completion*
| Phase 13 P01 | 3min | 2 tasks | 7 files |
| Phase 13 P02 | 2min | 2 tasks | 4 files |

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
- [Phase 12]: Denormalized farm_id on readings/allocations with BEFORE INSERT triggers for direct PowerSync sync rule filtering
- [Phase 12]: GPS proximity split into getDistanceToWell + isInRange for UI flexibility (display distance even when out of range)
- [Phase 12]: PowerSync text columns mapped with ?? '' for NOT NULL fields (type-level null vs database-level NOT NULL)
- [Phase 13]: Sheet uses Headless UI Dialog with static prop -- backdrop tap does NOT dismiss (user decision)
- [Phase 13]: Proximity ordering via @turf/distance: current well at index 0, rest sorted nearest-to-farthest
- [Phase 13]: react-swipeable for gesture handling (swipe-down dismiss, swipe-left/right well cycling)
- [Phase 13]: GPS proximity autoRequest: false -- does not prompt for location, only displays if previously granted
- [Phase 13]: Current allocation found by date range match with fallback to most recent

### Pending Todos

- [04-03]: PowerSync Dashboard sync rules for farms table need manual verification for super_admin cross-farm access
- [v1.0 tech debt]: Custom Access Token Hook needs manual enablement in Supabase Dashboard
- [v1.0 tech debt]: PowerSync Dashboard sync rules need manual verification for invited_first_name/invited_last_name

### Blockers/Concerns

- ~~v2.0 requires new database tables (readings, allocations) -- tables were DROPPED in migration 013 and never recreated~~ RESOLVED in 12-01 (migration 031)
- ~~PowerSync schema and sync rules need updates for new tables~~ RESOLVED in 12-01
- ~~Allocation schema changed from year-only to period-based -- confirm before implementing~~ RESOLVED in 12-01 (period_start/period_end with CHECK constraint)
- PowerSync Dashboard sync rules need updating with farm_readings and farm_allocations buckets (manual step)

## Session Continuity

Last session: 2026-02-19
Stopped at: Completed 13-02-PLAN.md
Resume file: .planning/phases/13-well-detail-page/13-02-SUMMARY.md
