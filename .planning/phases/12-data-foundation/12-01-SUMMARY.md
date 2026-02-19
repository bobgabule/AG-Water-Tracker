---
phase: 12-data-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, powersync, rls, sync-rules, migrations, offline-sync]

# Dependency graph
requires:
  - phase: 06-invite-system
    provides: "farm_members table and get_user_farm_ids/get_user_admin_farm_ids RLS helper functions"
  - phase: 03-role-foundation
    provides: "wells table with farm_id foreign key"
provides:
  - "readings table in Supabase with RLS policies and farm_id denormalization"
  - "allocations table in Supabase with RLS policies and farm_id denormalization"
  - "PowerSync schema definitions for readings and allocations with ReadingRow/AllocationRow types"
  - "PowerSync connector upload support for readings and allocations with boolean normalization"
  - "Sync rules documentation for farm_readings and farm_allocations buckets"
affects: [13-meter-reading-flow, 14-well-detail-readings, 15-allocation-management, 16-dashboard-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Denormalized farm_id with BEFORE INSERT trigger for PowerSync sync rule filtering"
    - "TEXT columns in PowerSync for NUMERIC Supabase values to preserve decimal precision"
    - "Boolean normalization pattern extended to readings (is_in_range) and allocations (is_manual_override)"

key-files:
  created:
    - supabase/migrations/031_create_readings_and_allocations.sql
  modified:
    - src/lib/powersync-schema.ts
    - src/lib/powersync-connector.ts
    - docs/powersync-sync-rules.yaml

key-decisions:
  - "Denormalized farm_id on both tables with BEFORE INSERT triggers for direct PowerSync sync rule filtering (no subqueries)"
  - "Readings RLS: SELECT/INSERT for all farm members, UPDATE/DELETE restricted to grower/admin (v2.0 READ-05/READ-06)"
  - "Allocations RLS: all CRUD open to any farm member (v2.0 decision: anyone with well access can set allocations)"
  - "Meter values stored as TEXT in PowerSync to preserve NUMERIC(15,2) precision from Supabase"

patterns-established:
  - "farm_id denormalization pattern: BEFORE INSERT trigger auto-populates from wells.farm_id, enabling direct bucket.farm_id filtering"
  - "Period-based allocations with CHECK constraint (period_end > period_start) and no overlap prevention (validated client-side)"

requirements-completed: [WELL-05, WELL-06, WELL-07, READ-01, READ-03, READ-05, READ-06, READ-07, ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04, ALLOC-05, ALLOC-06, PROX-02]

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 12 Plan 01: Data Foundation Summary

**Supabase readings/allocations tables with denormalized farm_id, RLS policies, PowerSync schema with type exports, and sync rules documentation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T00:16:33Z
- **Completed:** 2026-02-19T00:19:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created Supabase migration with readings and allocations tables, 6 indexes, BEFORE INSERT triggers for farm_id auto-population, and 8 RLS policies
- Updated PowerSync schema with readings and allocations table definitions, exported ReadingRow and AllocationRow types
- Extended PowerSync connector with readings/allocations in ALLOWED_TABLES and boolean normalization for is_in_range and is_manual_override
- Documented farm_readings and farm_allocations sync rule buckets using direct farm_id filtering pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase migration for readings and allocations tables** - `2d04f2e` (feat)
2. **Task 2: Update PowerSync schema, connector, and sync rules documentation** - `8c605e7` (feat)

## Files Created/Modified
- `supabase/migrations/031_create_readings_and_allocations.sql` - Readings and allocations tables with indexes, triggers, and RLS policies
- `src/lib/powersync-schema.ts` - PowerSync schema with readings/allocations tables and ReadingRow/AllocationRow type exports
- `src/lib/powersync-connector.ts` - Connector with readings/allocations in ALLOWED_TABLES and boolean normalization
- `docs/powersync-sync-rules.yaml` - Sync rules documentation with farm_readings and farm_allocations bucket definitions

## Decisions Made
- Used denormalized farm_id on both tables with BEFORE INSERT triggers (set_reading_farm_id, set_allocation_farm_id) to enable direct PowerSync sync rule filtering without subqueries
- Readings UPDATE/DELETE restricted to grower/admin per v2.0 decisions READ-05 and READ-06
- Allocations CRUD open to all farm members per v2.0 decision (anyone with well access can set allocations)
- Meter values stored as column.text in PowerSync to preserve NUMERIC(15,2) decimal precision from Supabase
- No overlap-prevention constraint on allocations (validated client-side in Phase 15 per research recommendation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**PowerSync Dashboard sync rules require manual configuration.** After deploying the Supabase migration:
1. Add `farm_readings` and `farm_allocations` bucket definitions to the PowerSync Dashboard sync rules
2. Copy the bucket configurations from `docs/powersync-sync-rules.yaml`
3. Test sync rules using the dashboard's testing tools
4. Deploy the updated sync rules

## Next Phase Readiness
- Data storage layer complete for all v2.0 features (Phases 13-16)
- Readings and allocations tables ready for CRUD operations
- PowerSync offline sync infrastructure ready for meter reading flow (Phase 13)
- Sync rules documentation ready for dashboard configuration

## Self-Check: PASSED

- All 5 files verified present on disk
- Commit `2d04f2e` (Task 1) verified in git log
- Commit `8c605e7` (Task 2) verified in git log

---
*Phase: 12-data-foundation*
*Completed: 2026-02-19*
