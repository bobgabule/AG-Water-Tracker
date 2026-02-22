# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** v3.0 Subscriptions & Permissions -- Phase 22 COMPLETE

## Current Position

Phase: 22 of 22 (Farm Data Isolation Audit) -- COMPLETE
Plan: 2 of 2 in current phase (all plans complete)
Status: Completed 22-02-PLAN.md -- phase complete
Last activity: 2026-02-22 -- Completed 22-02-PLAN.md (useActiveFarm migration + super admin UI)

Progress: ████████████████████ ~100% (v3.0 -- all 6 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 49 (25 v1.0 + 3 v1.1 + 12 v2.0 + 9 v3.0)
- Average duration: ~4min
- Total execution time: ~2.5 hours

**By Milestone:**

| Milestone | Phases | Plans | Timeline |
|-----------|--------|-------|----------|
| v1.0 MVP | 1-8 | 25 | 2026-02-10 to 2026-02-11 |
| v1.1 Dashboard & Map | 9-11 | 3 | 2026-02-12 |
| v2.0 Meter Readings | 12-16 | 12 | 2026-01-31 to 2026-02-19 |
| v3.0 Subscriptions | 17-22 | 9 | 2026-02-22 |

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

**Phase 19 decisions (plan 01):**
- Removed isAdminOrAbove helper -- confirmed zero imports across codebase
- useParams called unconditionally in RequireRole for dynamic fallback resolution

**Phase 19 decisions (plan 02):**
- Permission check lifted to WellDetailPage (top of chain) rather than inside React.memo components
- Edit button completely hidden (not disabled) for meter checkers per user decision

**Phase 20 decisions (plan 01):**
- No status filter on well count -- all non-deleted wells count (wells are hard-deleted)
- Null tier allows creation (offline graceful degradation)
- Growers/super_admins see "Upgrade Plan" button, admins see dismiss-only modal
- buildSubscriptionUrl uses encodeURIComponent for param safety

**Phase 20 decisions (plan 02):**
- SettingsPage subscription section uses dark theme (bg-gray-800) matching existing page design
- Subscription section placed between Profile and Account sections for logical grouping

**Phase 22 decisions (plan 01):**
- app_settings table has no description column; super_admin_user_id uses key+value only
- super_admin_user_id starts empty -- set when the account is created
- No new GRANT needed for updated join_farm_with_code_impl -- existing grants from migration 024 cover it

**Phase 22 decisions (plan 02):**
- useUserRole.ts keeps authStatus.farmId to avoid circular dependency with useActiveFarm
- FarmSelector.tsx keeps authStatus.farmId as ownFarmId for own-farm vs override comparison
- AppLayout.tsx farmName prop to Header is correct -- only used for non-super_admin users
- WellEditPage added as deviation fix for consistent farm name display during farm override

### Pending Todos (manual steps)

- PowerSync Dashboard sync rules need updating with `farm_readings` and `farm_allocations` buckets
- Custom Access Token Hook needs manual enablement in Supabase Dashboard
- PowerSync Dashboard sync rules need verification for invited_first_name/invited_last_name

### Blockers/Concerns

- CRITICAL SEQUENCING: Permission UI (Phase 19) must deploy before any RLS tightening to avoid offline queue corruption
- CRITICAL SEQUENCING: Backend auto-matching RPC (AUTH-06) must deploy before registration page removal (AUTH-01)

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 22-02-PLAN.md (useActiveFarm migration + super admin UI)
Resume file: .planning/phases/22-farm-data-isolation-audit/22-02-SUMMARY.md
Next action: v3.0 Subscriptions & Permissions milestone complete -- all phases done
