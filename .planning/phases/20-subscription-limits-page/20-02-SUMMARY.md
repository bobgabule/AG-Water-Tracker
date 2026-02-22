---
phase: 20-subscription-limits-page
plan: 02
subsystem: ui
tags: [react, subscription, upgrade-path, settings, powersync]

# Dependency graph
requires:
  - phase: 20-subscription-limits-page/01
    provides: buildSubscriptionUrl utility, useWellCount hook, useAppSetting hook
  - phase: 18-subscription-enforcement
    provides: useSubscriptionTier hook, useSeatUsage hook, subscription_tiers table
  - phase: 19-permission-enforcement
    provides: hasPermission utility, canManageFarm permission check
provides:
  - Upgrade Plan link in AddUserModal for growers when seats are full
  - Consistent well count on SubscriptionPage (no status filter, matches enforcement)
  - Tier-parameterized Manage Plan URL on SubscriptionPage
  - Manage Subscription navigation link on SettingsPage for growers
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-based upgrade link visibility (grower sees link, admin sees contact message)"
    - "Shared buildSubscriptionUrl for all external subscription URLs"

key-files:
  created: []
  modified:
    - src/components/AddUserModal.tsx
    - src/pages/SubscriptionPage.tsx
    - src/pages/SettingsPage.tsx

key-decisions:
  - "SettingsPage subscription section uses dark theme (bg-gray-800) to match existing page design instead of green theme from plan"
  - "Subscription section placed between Profile and Account sections for logical grouping"

patterns-established:
  - "All external subscription URLs use buildSubscriptionUrl with farm_id and tier params"

requirements-completed: [TIER-07, TIER-08]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 20 Plan 02: Subscription Page & Upgrade Links Summary

**Upgrade path links in AddUserModal for growers, consistent well count via useWellCount hook, tier-parameterized Manage Plan URL, and Manage Subscription link on SettingsPage**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T06:05:28Z
- **Completed:** 2026-02-22T06:09:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- AddUserModal shows "Upgrade Plan" link for growers/super_admin when all seats are full, with farm_id and tier params in the URL
- AddUserModal shows "Contact your farm owner to upgrade" for admin callers (they cannot manage subscriptions)
- SubscriptionPage well count replaced with shared useWellCount hook (no status='active' filter, matches enforcement logic)
- SubscriptionPage "Manage Plan" URL now includes tier param via buildSubscriptionUrl
- SettingsPage has "Manage Subscription" link visible only to growers/super_admin, navigating to /subscription

## Task Commits

Each task was committed atomically:

1. **Task 1: Add upgrade link to AddUserModal and fix SubscriptionPage well count and URL** - `b6b506a` (feat)
2. **Task 2: Add "Manage Subscription" link on Settings page for growers** - `4e0c824` (feat)

## Files Created/Modified
- `src/components/AddUserModal.tsx` - Added upgrade link with role-based visibility and buildSubscriptionUrl integration
- `src/pages/SubscriptionPage.tsx` - Replaced inline well count query with useWellCount hook, updated Manage Plan URL with tier param
- `src/pages/SettingsPage.tsx` - Added Subscription section with Manage Subscription navigation button for growers

## Decisions Made
- SettingsPage subscription section styled with dark theme (bg-gray-800, text-gray-300) to match the existing page design, rather than the green theme suggested in the plan which would have been visually inconsistent
- Subscription section placed between Profile and Account sections for logical grouping

## Deviations from Plan

None - plan executed exactly as written (only minor style adaptation to match existing SettingsPage theme).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 20 (Subscription Limits & Page) is now fully complete
- All subscription limit enforcement (wells + seats) and UI (upgrade links, subscription page, settings link) are in place
- Ready for Phase 21 execution

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit `b6b506a` (Task 1) verified in git log
- Commit `4e0c824` (Task 2) verified in git log
- TypeScript compiles with zero errors

---
*Phase: 20-subscription-limits-page*
*Completed: 2026-02-22*
