---
phase: 22-farm-data-isolation-audit
plan: 02
subsystem: ui
tags: [zustand, persist, react-hooks, super-admin, farm-isolation]

# Dependency graph
requires:
  - phase: 21-login-only-auth-flow
    provides: useActiveFarm hook and activeFarmStore for farm override
provides:
  - All data hooks and pages query by active farm (own or super_admin override)
  - Zustand persist middleware on activeFarmStore for page reload survival
  - Maroon header visual indicator for super_admin users
  - Sync rules documentation for super_admin auto-membership
affects: [farm-data-isolation, super-admin-experience]

# Tech tracking
tech-stack:
  added: []
  patterns: [zustand-persist-middleware, active-farm-pattern]

key-files:
  created: []
  modified:
    - src/hooks/useWells.ts
    - src/hooks/useWellCount.ts
    - src/hooks/useSubscriptionTier.ts
    - src/hooks/useSeatUsage.ts
    - src/pages/DashboardPage.tsx
    - src/pages/WellListPage.tsx
    - src/pages/WellDetailPage.tsx
    - src/pages/WellEditPage.tsx
    - src/pages/WellAllocationsPage.tsx
    - src/pages/UsersPage.tsx
    - src/pages/SubscriptionPage.tsx
    - src/pages/SettingsPage.tsx
    - src/components/PendingInvitesList.tsx
    - src/components/AddUserModal.tsx
    - src/stores/activeFarmStore.ts
    - src/components/Header.tsx
    - docs/powersync-sync-rules.yaml

key-decisions:
  - "useUserRole.ts intentionally keeps authStatus.farmId to avoid circular dependency with useActiveFarm"
  - "FarmSelector.tsx intentionally keeps authStatus.farmId as ownFarmId for own-farm vs override comparison"
  - "AppLayout.tsx farmName prop to Header is correct because Header only uses it for non-super_admin users"
  - "WellEditPage.tsx added as deviation fix to ensure consistent farm name display"

patterns-established:
  - "useActiveFarm pattern: all data queries derive farmId from useActiveFarm(), never from authStatus directly"
  - "Zustand persist pattern: stores needing page-reload survival use persist middleware with prefixed key"

requirements-completed: [ISO-01, ISO-02, ISO-03]

# Metrics
duration: 12min
completed: 2026-02-22
---

# Phase 22 Plan 02: Farm Data Isolation Audit Summary

**All 14 data hooks, pages, and components now query by active farm via useActiveFarm(), with Zustand persist for page reload survival and maroon header for super_admin visual awareness**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-22T13:22:40Z
- **Completed:** 2026-02-22T13:34:14Z
- **Tasks:** 3 (plus 1 deviation fix)
- **Files modified:** 17

## Accomplishments
- All 4 data hooks (useWells, useWellCount, useSubscriptionTier, useSeatUsage) derive farmId from useActiveFarm() instead of authStatus
- All 10 pages and components use useActiveFarm() for farm-scoped data queries and display
- activeFarmStore persists to localStorage via Zustand persist middleware (key: 'ag-active-farm')
- Header displays maroon background (#800000) for super_admin users as visual indicator
- Sync rules documentation updated with super_admin auto-membership note

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix data hooks to use useActiveFarm** - `b24f209` (feat)
2. **Task 2: Fix pages and components to use useActiveFarm** - `5c9d95b` (feat)
3. **Task 3: Add Zustand persist, maroon header, sync rules docs** - `96b597d` (feat)
4. **Deviation: WellEditPage farmName fix** - `745f826` (fix)

## Files Created/Modified
- `src/hooks/useWells.ts` - farmId from useActiveFarm instead of authStatus
- `src/hooks/useWellCount.ts` - farmId from useActiveFarm instead of authStatus
- `src/hooks/useSubscriptionTier.ts` - farmId from useActiveFarm instead of authStatus
- `src/hooks/useSeatUsage.ts` - farmId from useActiveFarm instead of authStatus
- `src/pages/DashboardPage.tsx` - farmId/farmName from useActiveFarm for well creation
- `src/pages/WellListPage.tsx` - farmId from useActiveFarm for latest readings
- `src/pages/WellDetailPage.tsx` - farmId/farmName from useActiveFarm
- `src/pages/WellEditPage.tsx` - farmName from useActiveFarm (deviation fix)
- `src/pages/WellAllocationsPage.tsx` - farmId/farmName from useActiveFarm for allocation CRUD
- `src/pages/UsersPage.tsx` - farmId from useActiveFarm for member queries
- `src/pages/SubscriptionPage.tsx` - farmId from useActiveFarm for tier display
- `src/pages/SettingsPage.tsx` - farmId from useActiveFarm for Farm ID display
- `src/components/PendingInvitesList.tsx` - farmId from useActiveFarm for invite queries
- `src/components/AddUserModal.tsx` - farmId/farmName from useActiveFarm for invite creation
- `src/stores/activeFarmStore.ts` - Added Zustand persist middleware
- `src/components/Header.tsx` - Conditional maroon background for super_admin
- `docs/powersync-sync-rules.yaml` - Super admin auto-membership documentation

## Decisions Made
- useUserRole.ts intentionally keeps authStatus.farmId to avoid circular dependency with useActiveFarm
- FarmSelector.tsx intentionally keeps authStatus.farmId as ownFarmId for distinguishing own farm from overrides
- AppLayout.tsx farmName prop to Header is correct -- Header only displays it for non-super_admin users (super_admin sees FarmSelector instead)
- Removed unused useAuth imports from files that no longer need auth context (WellListPage, SubscriptionPage, PendingInvitesList, AddUserModal)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] WellEditPage farmName not using active farm**
- **Found during:** Final verification (post-Task 3)
- **Issue:** WellEditPage.tsx used authStatus?.farmName for the edit page header, which would show the wrong farm name when super_admin is viewing another farm's well
- **Fix:** Replaced authStatus?.farmName with useActiveFarm().farmName
- **Files modified:** src/pages/WellEditPage.tsx
- **Verification:** TypeScript compiles, grep confirms no authStatus?.farmId in data-query files
- **Committed in:** 745f826

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for consistency. WellEditPage was not in the original plan's file list but displayed farm name from wrong source. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Farm data isolation is complete -- super_admin farm switching now propagates through every data query
- activeFarmStore persists across page reloads
- Header provides constant visual awareness of super_admin privilege level
- All remaining authStatus?.farmId references are intentional (useActiveFarm source, useUserRole circular dep, FarmSelector ownFarmId)

## Self-Check: PASSED

All 17 modified files verified on disk. All 4 commit hashes verified in git history.

---
*Phase: 22-farm-data-isolation-audit*
*Completed: 2026-02-22*
