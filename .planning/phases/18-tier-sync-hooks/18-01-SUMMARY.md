---
phase: 18-tier-sync-hooks
plan: 01
subsystem: hooks
tags: [powersync, sync-rules, react-hooks, offline, subscription]

# Dependency graph
requires:
  - phase: 17-subscription-database-foundation
    provides: subscription_tiers and app_settings tables in Supabase
provides:
  - useAppSetting() generic hook for reading app_settings key-value pairs from PowerSync
  - AddUserModal loading guard when tier data not yet synced
  - PowerSync global bucket sync rules for subscription_tiers and app_settings
affects: [18-02 (SubscriptionPage enhancements), 20-subscription-limits-page, 21-login-only-auth-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generic key-value hook pattern: useAppSetting(key, defaultValue?) for app_settings table"
    - "Global bucket sync rules for read-only config tables (no user/farm scoping needed)"
    - "Loading guard pattern: show spinner and disable actions while tier data is null"

key-files:
  created:
    - src/hooks/useAppSetting.ts
  modified:
    - src/components/AddUserModal.tsx
    - docs/powersync-sync-rules.yaml

key-decisions:
  - "Generic useAppSetting(key) pattern instead of per-setting hooks -- extensible without code changes"
  - "Query by id column (not key) because PowerSync maps key AS id in sync rules"
  - "Loading guard replaces form content entirely (same pattern as allSeatsFull block)"
  - "Consolidated farm_invites sync rules from 3 role-specific buckets to 1 unified bucket"

patterns-established:
  - "useAppSetting(key, defaultValue?): Generic hook for reading any app_settings value from PowerSync local SQLite"
  - "Global bucket naming: {table}_global for config tables that sync to all authenticated users"
  - "Loading guard: disable action buttons and show spinner when tier/config data is null (not yet synced)"

requirements-completed: [TIER-04]

# Metrics
duration: ~10min
completed: 2026-02-22
---

# Phase 18 Plan 01: Tier Sync & App Settings Hook Summary

**PowerSync global bucket sync rules for subscription_tiers and app_settings deployed, useAppSetting() generic hook created, and AddUserModal guarded with tier-loading state**

## Performance

- **Duration:** ~10 min (Task 1 automated, Task 2 human-verify checkpoint)
- **Started:** 2026-02-22
- **Completed:** 2026-02-22
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- Created generic `useAppSetting(key, defaultValue?)` hook for reading any app_settings value from PowerSync local SQLite
- Added tier-loading guard to AddUserModal: shows "Loading plan limits..." spinner and disables Send Invite button when subscription tier data is null
- Updated PowerSync sync rules YAML documentation with `subscription_tiers_global` and `app_settings_global` global bucket definitions
- Consolidated farm_invites sync rules from 3 role-specific buckets into 1 unified bucket
- Human verified sync rules deployed to PowerSync dashboard and data syncing to clients

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAppSetting hook and add loading state to AddUserModal** - `f6ea8da` (feat)
2. **Task 2: Deploy sync rules to PowerSync dashboard** - `52248f6` (docs - YAML update, deployment verified via human checkpoint)

## Files Created/Modified
- `src/hooks/useAppSetting.ts` - Generic hook for reading app_settings key-value pairs via PowerSync query
- `src/components/AddUserModal.tsx` - Added useSubscriptionTier() import and loading guard when tier is null
- `docs/powersync-sync-rules.yaml` - Added subscription_tiers_global and app_settings_global bucket definitions, consolidated farm_invites

## Decisions Made
- Used generic `useAppSetting(key)` pattern rather than per-setting hooks -- new settings can be added to DB without code changes
- Hook queries by `id` column (not `key`) because PowerSync sync rules map `key AS id` for PK compatibility
- Loading guard in AddUserModal replaces form content entirely with a centered spinner + "Loading plan limits..." message, matching the existing `allSeatsFull` block pattern
- Consolidated farm_invites from 3 role-specific sync buckets to 1 unified bucket -- UI handles permission gating

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - sync rules were deployed to PowerSync dashboard during the human-verify checkpoint (Task 2).

## Next Phase Readiness
- subscription_tiers and app_settings data now syncs offline via PowerSync global buckets
- useAppSetting hook is ready for use in Phase 21 (login-only auth flow) to read subscription_website_url
- Plan 18-02 (SubscriptionPage enhancements) can proceed -- useSubscriptionTier() and useSeatUsage() hooks already exist
- Remaining unstaged files (useSubscriptionTier.ts, useSeatUsage.ts, subscription.ts, SubscriptionPage.tsx, powersync-schema.ts) belong to plan 18-02

## Self-Check: PASSED

- FOUND: src/hooks/useAppSetting.ts
- FOUND: src/components/AddUserModal.tsx
- FOUND: docs/powersync-sync-rules.yaml
- FOUND: 18-01-SUMMARY.md
- FOUND: commit f6ea8da
- FOUND: commit 52248f6

---
*Phase: 18-tier-sync-hooks*
*Completed: 2026-02-22*
