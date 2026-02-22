# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** v3.0 Subscriptions & Permissions -- Phase 18 complete, ready for Phase 19

## Current Position

Phase: 18 of 22 (Tier Sync & Hooks) -- COMPLETE
Plan: 2 of 2 in current phase (COMPLETE -- all plans done)
Status: Phase 18 complete -- ready for Phase 19
Last activity: 2026-02-22 -- Completed 18-02-PLAN.md (SubscriptionPage enhancements + DB-driven tier limits)

Progress: █████░░░░░░░░░░░░░░░ ~37% (v3.0 -- 2 phases complete of 6 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 43 (25 v1.0 + 3 v1.1 + 12 v2.0 + 3 v3.0)
- Average duration: ~4min
- Total execution time: ~2.5 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 MVP | 1-8 | 25 | 2026-02-10 to 2026-02-11 |
| v1.1 Dashboard & Map | 9-11 | 3 | 2026-02-12 |
| v2.0 Meter Readings | 12-16 | 12 | 2026-01-31 to 2026-02-19 |
| v3.0 Subscriptions | 17-22 | 3 | 2026-02-22 to ... |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (29 decisions).

**Phase 17 decisions:**
- Tier name is 'Starter' not 'Basic' per user decision
- No DEFAULT on farms.subscription_tier -- new farms must set tier explicitly
- Grower seat limit not stored in tiers table -- always 1 per farm, inherent
- Existing farms backfilled to 'pro' tier during migration
- Read-only RLS for authenticated users, writes via service_role/dashboard only

**Phase 18 decisions (plan 01):**
- Generic useAppSetting(key) pattern instead of per-setting hooks -- extensible without code changes
- Query by id column (not key) because PowerSync maps key AS id in sync rules
- Loading guard replaces form content entirely (same pattern as allSeatsFull block)
- Consolidated farm_invites sync rules from 3 role-specific buckets to 1 unified bucket

**Phase 18 decisions (plan 02):**
- Well count filters by status='active' so decommissioned wells don't count against tier limit
- Manage Plan button hidden (not disabled) when subscription_website_url is empty -- no broken links
- PLAN_LIMITS hardcoded constant fully removed; replaced by DB-driven useSubscriptionTier() hook
- All deferred tier replacement files from 18-01 committed as part of 18-02

### Pending Todos (manual steps)

- PowerSync Dashboard sync rules need updating with `farm_readings` and `farm_allocations` buckets
- Custom Access Token Hook needs manual enablement in Supabase Dashboard
- PowerSync Dashboard sync rules need verification for invited_first_name/invited_last_name

### Blockers/Concerns

- CRITICAL SEQUENCING: Permission UI (Phase 19) must deploy before any RLS tightening to avoid offline queue corruption
- CRITICAL SEQUENCING: Backend auto-matching RPC (AUTH-06) must deploy before registration page removal (AUTH-01)

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 18-02-PLAN.md (Phase 18 complete)
Resume file: .planning/phases/18-tier-sync-hooks/18-02-SUMMARY.md
Next action: Plan and execute Phase 19 (Permission UI)
