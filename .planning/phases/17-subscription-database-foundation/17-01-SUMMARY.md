---
phase: 17-subscription-database-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, migration, subscription, rls]

# Dependency graph
requires:
  - phase: 16-reading-management-map-integration
    provides: existing farm schema and migration conventions
provides:
  - subscription_tiers lookup table with Starter and Pro tiers
  - app_settings key-value config table
  - farms.subscription_tier FK column linking farms to tiers
  - RLS policies for authenticated read access on config tables
affects: [18-tier-sync-hooks, 20-subscription-limits-page, 21-login-only-auth-flow, 22-farm-data-isolation-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-step ALTER pattern: add nullable, backfill, constrain NOT NULL"
    - "Lookup table with slug PK for extensible tier configuration"
    - "Key-value app_settings table for global config without code deploys"

key-files:
  created:
    - supabase/migrations/033_subscription_tier_tables.sql
  modified: []

key-decisions:
  - "Tier name is 'Starter' not 'Basic' per user decision"
  - "No DEFAULT on farms.subscription_tier -- new farms must set tier explicitly"
  - "Grower seat limit not stored in tiers table -- always 1 per farm, inherent"
  - "Existing farms backfilled to 'pro' tier during migration"
  - "Read-only RLS for authenticated users, writes via service_role/dashboard only"

patterns-established:
  - "Slug-based PK for lookup tables: enables readable FK values and simple joins"
  - "Three-step migration for NOT NULL FK on existing tables: add nullable -> backfill -> constrain"
  - "Config tables with RLS read-only for authenticated, managed via dashboard"

requirements-completed: [TIER-01, TIER-02, TIER-03]

# Metrics
duration: ~15min
completed: 2026-02-22
---

# Phase 17 Plan 01: Subscription Database Foundation Summary

**Migration 033 creates subscription_tiers and app_settings tables with RLS, plus farms.subscription_tier FK column backfilled to 'pro' for existing farms**

## Performance

- **Duration:** ~15 min (Task 1 automated, Task 2 human-verify checkpoint)
- **Started:** 2026-02-22
- **Completed:** 2026-02-22
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments
- Created `subscription_tiers` table with Starter (5 wells, 1 admin, 1 meter checker) and Pro (10 wells, 1 admin, 3 meter checkers) tiers
- Created `app_settings` key-value table with subscription_website_url, support_email, and app_url placeholder rows
- Added `farms.subscription_tier` NOT NULL FK column with safe three-step migration (add nullable, backfill 'pro', constrain NOT NULL)
- Enabled RLS on both new tables with authenticated read-only policies
- Human verified migration applied successfully in Supabase (tables, data, RLS, join query all confirmed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 033 for subscription tier tables** - `676c46f` (feat)
2. **Task 2: Apply migration and verify in Supabase** - Human-verify checkpoint (no code commit, migration applied manually)

## Files Created/Modified
- `supabase/migrations/033_subscription_tier_tables.sql` - Complete migration creating subscription_tiers, app_settings, farms.subscription_tier column with RLS and seed data

## Decisions Made
- Used 'Starter' tier name (not 'Basic') per explicit user decision from CONTEXT.md
- No DEFAULT value on farms.subscription_tier -- new farms must have tier set explicitly at creation time
- Grower is always 1 per farm (inherent to farm concept), not stored as a seat limit in tiers
- All existing farms backfilled to 'pro' tier to match current functionality
- Config tables are read-only for authenticated users; writes managed via Supabase dashboard using service_role

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - migration was applied to Supabase during the human-verify checkpoint (Task 2).

## Next Phase Readiness
- subscription_tiers and app_settings tables exist in Supabase and are ready for PowerSync sync rules (Phase 18)
- farms.subscription_tier column is ready for hook queries (Phase 18: useSubscriptionTier)
- App settings placeholder values should be updated to real URLs/email before production use
- Phase 18 (Tier Sync & Hooks) and Phase 19 (Permission Enforcement) can proceed in parallel

## Self-Check: PASSED

- FOUND: supabase/migrations/033_subscription_tier_tables.sql
- FOUND: commit 676c46f
- FOUND: 17-01-SUMMARY.md

---
*Phase: 17-subscription-database-foundation*
*Completed: 2026-02-22*
