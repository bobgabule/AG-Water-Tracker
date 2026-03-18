---
phase: 44-farm-subscription-cancellation-lifecycle-with-read-only-retention-and-auto-deletion
plan: 02
subsystem: ui
tags: [react, powersync, subscription, read-only, i18n, stripe]

# Dependency graph
requires:
  - phase: 44-01
    provides: "Stripe webhook + DB columns for subscription_status and current_period_end"
provides:
  - "useFarmReadOnly hook returning isReadOnly boolean from PowerSync farms table"
  - "Read-only banner on SubscriptionPage with renew button (owner only)"
  - "Disabled write actions across 8 components when farm is read-only"
  - "EN/ES translations for read-only UI strings"
affects: [44-03-auto-deletion]

# Tech tracking
tech-stack:
  added: []
  patterns: ["useFarmReadOnly hook pattern for subscription-gated write access"]

key-files:
  created:
    - src/hooks/useFarmReadOnly.ts
  modified:
    - src/pages/SubscriptionPage.tsx
    - src/pages/DashboardPage.tsx
    - src/components/NewReadingSheet.tsx
    - src/pages/WellEditPage.tsx
    - src/pages/WellAllocationsPage.tsx
    - src/pages/UsersPage.tsx
    - src/pages/ReportsPage.tsx
    - src/pages/ReadingDetailPage.tsx
    - src/components/AddUserModal.tsx
    - src/i18n/en.ts
    - src/i18n/es.ts

key-decisions:
  - "useFarmReadOnly reads from PowerSync (not direct Supabase) for offline-capable status detection"
  - "Deletion date computed client-side as current_period_end + 1 year"
  - "Read-only banner only on SubscriptionPage for owner role; other pages show disabled buttons without messaging"
  - "openPortal() with no flow_type for renew button opens general Stripe Customer Portal"

patterns-established:
  - "useFarmReadOnly hook: centralized read-only check imported by all write-action components"
  - "Guard pattern: if (isReadOnly) return; at top of write handlers + disabled={isReadOnly} on buttons"

requirements-completed: [CANCEL-03, CANCEL-04, CANCEL-05]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 44 Plan 02: Read-Only UI Enforcement Summary

**useFarmReadOnly hook gates all write actions across 8 components when subscription is canceled and period ended, with owner-only renewal banner on SubscriptionPage**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T02:59:22Z
- **Completed:** 2026-03-18T03:04:45Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Created useFarmReadOnly hook reading subscription_status and current_period_end from PowerSync farms table
- Added read-only banner with renew button on SubscriptionPage (owner/super_admin only)
- Disabled all write-action buttons across DashboardPage, NewReadingSheet, WellEditPage, WellAllocationsPage, UsersPage, ReportsPage, ReadingDetailPage, and AddUserModal
- Added 3 new i18n keys (readOnlyBanner, renewSubscription, readOnly) in both English and Spanish

## Task Commits

Each task was committed atomically:

1. **Task 1: useFarmReadOnly hook + subscription page read-only banner** - `7d85a94` (feat)
2. **Task 2: Disable write actions across all components + i18n** - `f4b9754` (feat)

## Files Created/Modified
- `src/hooks/useFarmReadOnly.ts` - Hook returning isReadOnly, deletionDate, loaded from PowerSync farms table
- `src/pages/SubscriptionPage.tsx` - Read-only banner with renew button, disabled add-on purchasing
- `src/pages/DashboardPage.tsx` - Disabled "New Well" FAB when read-only
- `src/components/NewReadingSheet.tsx` - Disabled save button, guarded saveReading
- `src/pages/WellEditPage.tsx` - Disabled save and delete buttons, guarded handlers
- `src/pages/WellAllocationsPage.tsx` - Disabled add/save/delete allocation buttons
- `src/pages/UsersPage.tsx` - Disabled invite button, guarded delete handler
- `src/pages/ReportsPage.tsx` - Disabled add/remove email buttons
- `src/pages/ReadingDetailPage.tsx` - Disabled delete reading button
- `src/components/AddUserModal.tsx` - Disabled invite submit button
- `src/i18n/en.ts` - Added subscription.readOnlyBanner, renewSubscription, readOnly
- `src/i18n/es.ts` - Added Spanish equivalents

## Decisions Made
- useFarmReadOnly reads from PowerSync (not direct Supabase) for offline-capable status detection
- Deletion date computed client-side as current_period_end + 1 year (no server round-trip)
- Read-only banner only on SubscriptionPage for owner role; other pages show disabled buttons without messaging per CONTEXT decisions
- openPortal() with no flow_type for renew button opens general Stripe Customer Portal where user can reactivate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Read-only UI enforcement complete, ready for Phase 44-03 (auto-deletion cron/edge function)
- All write paths are guarded both at the button level (disabled) and handler level (early return)

## Self-Check: PASSED

All 12 files verified present. Both task commits (7d85a94, f4b9754) verified in git log.

---
*Phase: 44-farm-subscription-cancellation-lifecycle-with-read-only-retention-and-auto-deletion*
*Completed: 2026-03-18*
