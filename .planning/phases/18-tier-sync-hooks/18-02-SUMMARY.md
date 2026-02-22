---
phase: 18-tier-sync-hooks
plan: 02
subsystem: ui
tags: [react, powersync, subscription, tier-limits, offline]

# Dependency graph
requires:
  - phase: 18-tier-sync-hooks
    provides: useAppSetting hook, useSubscriptionTier hook, PowerSync sync rules for subscription_tiers and app_settings
  - phase: 17-subscription-database-foundation
    provides: subscription_tiers and app_settings tables in Supabase
provides:
  - Well count display vs tier limit on SubscriptionPage
  - Conditional "Manage Plan" external link button on SubscriptionPage
  - DB-driven tier limits replacing all hardcoded PLAN_LIMITS usage
  - useSubscriptionTier() hook for two-step farm tier lookup from PowerSync
  - Updated PowerSync schema with subscription_tiers and app_settings tables
affects: [19-permission-ui, 20-subscription-limits-page, 21-login-only-auth-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Well count query pattern: COUNT(*) FROM wells WHERE farm_id = ? AND status = 'active' for active-only counting"
    - "Conditional external link: hide button when app_settings URL is empty/null, append farm_id as query parameter"
    - "DB-driven tier replacement: useSubscriptionTier() replaces hardcoded PLAN_LIMITS across all consumers"

key-files:
  created:
    - src/hooks/useSubscriptionTier.ts
  modified:
    - src/pages/SubscriptionPage.tsx
    - src/hooks/useSeatUsage.ts
    - src/lib/powersync-schema.ts
    - src/lib/subscription.ts

key-decisions:
  - "Include all DB-driven tier replacement files in this commit since they were deferred from 18-01"
  - "Well count filters by status='active' so decommissioned wells don't count against tier limit"
  - "Manage Plan button hidden when subscription_website_url is empty -- no broken links"
  - "PLAN_LIMITS constant removed and replaced with Set-based isSeatLimited() helper"

patterns-established:
  - "Conditional external link: check app_settings value, append query params, open in new tab with noopener noreferrer"
  - "Well count query: parameterized COUNT with status filter for tier limit comparison"

requirements-completed: [TIER-05]

# Metrics
duration: ~5min
completed: 2026-02-22
---

# Phase 18 Plan 02: Subscription Page Enhancements Summary

**Well count display with tier limit and 'Full' badge, conditional Manage Plan external link, DB-driven tier replacement across all hook consumers, and skeleton loading states**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-22T00:24:27Z
- **Completed:** 2026-02-22T00:28:00Z
- **Tasks:** 1/1
- **Files modified:** 5

## Accomplishments
- Added well count row to SubscriptionPage showing active wells vs tier limit with red "Full" badge at capacity
- Added conditional "Manage Plan" button that opens external subscription management URL with farm_id parameter (hidden when URL is not set)
- Replaced all hardcoded PLAN_LIMITS usage with DB-driven useSubscriptionTier() hook
- Created useSubscriptionTier hook for two-step PowerSync lookup (farm tier slug then tier limits)
- Updated PowerSync schema with subscription_tiers and app_settings table definitions
- Added 3-row skeleton loading state covering admins, meter checkers, and wells while tier data loads
- Removed hardcoded "Contact us to upgrade your plan" placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Add well count display and Manage Plan button to SubscriptionPage** - `d029a68` (feat)

## Files Created/Modified
- `src/hooks/useSubscriptionTier.ts` - New hook for two-step farm tier lookup from PowerSync (farm slug then tier limits)
- `src/pages/SubscriptionPage.tsx` - Added well count display, Manage Plan button, and improved loading states
- `src/hooks/useSeatUsage.ts` - Switched from hardcoded PLAN_LIMITS to useSubscriptionTier() for dynamic tier limits
- `src/lib/powersync-schema.ts` - Added subscription_tiers and app_settings table definitions, farms.subscription_tier column
- `src/lib/subscription.ts` - Removed hardcoded PLAN_LIMITS constant, replaced with Set-based isSeatLimited() helper

## Decisions Made
- Included all DB-driven tier replacement files (useSubscriptionTier.ts, useSeatUsage.ts, subscription.ts, powersync-schema.ts) that were deferred from plan 18-01 as they are prerequisites for the SubscriptionPage enhancements
- Well count query filters by `status = 'active'` so decommissioned wells don't count against tier limit
- Manage Plan button is completely hidden (not disabled) when subscription_website_url is empty or not set -- no broken link risk
- PLAN_LIMITS constant fully removed; isSeatLimited() now uses a Set for O(1) lookup

## Deviations from Plan

None - plan executed exactly as written. The additional files (useSubscriptionTier.ts, useSeatUsage.ts, subscription.ts, powersync-schema.ts) were explicitly deferred from plan 18-01 and documented as "belonging to plan 18-02" in the 18-01 SUMMARY.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SubscriptionPage now shows complete tier usage (admins, meter checkers, wells) from DB-driven data
- Manage Plan button is ready to become visible once a real subscription_website_url is inserted into app_settings
- Phase 18 (Tier Sync & Hooks) is fully complete -- all hardcoded tier limits replaced with DB-driven values
- Phase 19 (Permission UI) can proceed

## Self-Check: PASSED

- FOUND: src/hooks/useSubscriptionTier.ts
- FOUND: src/pages/SubscriptionPage.tsx
- FOUND: src/hooks/useSeatUsage.ts
- FOUND: src/lib/powersync-schema.ts
- FOUND: src/lib/subscription.ts
- FOUND: 18-02-SUMMARY.md
- FOUND: commit d029a68

---
*Phase: 18-tier-sync-hooks*
*Completed: 2026-02-22*
