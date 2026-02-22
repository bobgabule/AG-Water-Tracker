---
phase: 20-subscription-limits-page
plan: 01
subsystem: ui
tags: [react, headless-ui, powersync, subscription, well-limit]

# Dependency graph
requires:
  - phase: 18-tier-sync-hooks
    provides: useSubscriptionTier hook with maxWells, useAppSetting hook
provides:
  - buildSubscriptionUrl utility for external subscription links
  - useWellCount hook for farm well count via PowerSync
  - WellLimitModal component with role-based upgrade CTA
  - Well creation limit enforcement in DashboardPage and WellListPage
affects: [20-subscription-limits-page, subscription-page, settings-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [tier-limit-guard-pattern, subscription-url-builder]

key-files:
  created:
    - src/lib/subscriptionUrls.ts
    - src/hooks/useWellCount.ts
    - src/components/WellLimitModal.tsx
  modified:
    - src/pages/DashboardPage.tsx
    - src/pages/WellListPage.tsx

key-decisions:
  - "No status filter on well count -- all non-deleted wells count per user decision (wells are hard-deleted)"
  - "Null tier allows creation (offline graceful degradation)"
  - "Growers see Upgrade Plan button, admins see dismiss-only modal"
  - "buildSubscriptionUrl uses encodeURIComponent for param safety"

patterns-established:
  - "Tier limit guard: check `tier && count >= tier.maxX` before action, show modal on block"
  - "Subscription URL builder: reusable across WellLimitModal, AddUserModal, SubscriptionPage, SettingsPage"

requirements-completed: [TIER-06]

# Metrics
duration: 4min
completed: 2026-02-22
---

# Phase 20 Plan 01: Well Limit Enforcement Summary

**Client-side well limit enforcement with WellLimitModal using PowerSync well count and tier limits from useSubscriptionTier**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-22T05:58:03Z
- **Completed:** 2026-02-22T06:01:51Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created reusable `buildSubscriptionUrl` utility with smart `?`/`&` separator logic
- Created `useWellCount` hook querying `COUNT(*)` from wells table via PowerSync (no status filter)
- Created `WellLimitModal` component with Headless UI v2 Dialog pattern and role-based upgrade CTA
- Wired tier limit checks into both DashboardPage and WellListPage `handleNewWell` handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared subscription URL builder and useWellCount hook** - `a5e5e48` (feat)
2. **Task 2: Create WellLimitModal and wire limit checks into DashboardPage and WellListPage** - `6a3fadd` (feat)

## Files Created/Modified
- `src/lib/subscriptionUrls.ts` - Shared URL builder for external subscription links with farm_id and tier params
- `src/hooks/useWellCount.ts` - PowerSync query hook returning farm well count (no status filter)
- `src/components/WellLimitModal.tsx` - Well limit reached modal with role-based Upgrade Plan CTA
- `src/pages/DashboardPage.tsx` - Added tier limit check in handleNewWell, renders WellLimitModal
- `src/pages/WellListPage.tsx` - Added tier limit check in handleNewWell, renders WellLimitModal

## Decisions Made
- No status filter on well count -- all non-deleted wells count (wells are hard-deleted so every row is a live well)
- Null tier allows creation -- offline graceful degradation per user decision
- Growers and super_admins see "Upgrade Plan" button; admins see dismiss-only modal
- Used encodeURIComponent for farm_id and tier params in subscription URL builder

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Well limit enforcement complete for both entry points (DashboardPage map and WellListPage)
- `buildSubscriptionUrl` utility ready for reuse in SubscriptionPage and SettingsPage (Plan 02)
- `useWellCount` hook available for any component needing farm well count

---
*Phase: 20-subscription-limits-page*
*Completed: 2026-02-22*
