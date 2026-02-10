---
phase: "04"
plan: "03"
subsystem: "permission-enforcement"
tags: [permissions, rbac, cross-farm, super-admin, zustand, farm-selector]
dependency-graph:
  requires: [03-01, 04-01]
  provides: [active-farm-override, farm-selector-ui]
  affects: [Header, AppLayout]
tech-stack:
  added: [zustand@5]
  patterns: [zustand-store, React.memo, useCallback, headless-ui-listbox, powersync-query]
key-files:
  created:
    - src/stores/activeFarmStore.ts
    - src/hooks/useActiveFarm.ts
    - src/components/FarmSelector.tsx
  modified:
    - src/components/Header.tsx
    - package.json
    - package-lock.json
  referenced:
    - src/lib/permissions.ts
    - src/hooks/useUserRole.ts
    - src/lib/AuthProvider.tsx
decisions:
  - Zustand v5 installed as new dependency (was in tech stack docs but not in package.json)
  - FarmSelector uses Headless UI Listbox with anchor positioning for dropdown
  - Own farm shown first in dropdown with (my farm) label
  - Override indicator (viewing) in yellow-300 for visual distinction
metrics:
  duration: "3min"
  completed: "2026-02-11"
  tasks: 2
  files-modified: 4
---

# Phase 4 Plan 3: Super Admin Cross-Farm Access Summary

Zustand store for active farm override, useActiveFarm hook for transparent farm resolution, FarmSelector dropdown with Headless UI Listbox, and Header integration gated by cross_farm_access permission.

## What Was Done

### Task 1: Create activeFarmStore and useActiveFarm hook

Created `src/stores/activeFarmStore.ts` -- a Zustand v5 store with:
- `overrideFarmId` / `overrideFarmName` state (null by default)
- `setActiveFarm(farmId, farmName)` action to set override
- `clearOverride()` action to return to own farm

Created `src/hooks/useActiveFarm.ts` -- a hook returning `{ farmId, farmName, isOverride }`:
- For `super_admin` with active override: returns override farm, `isOverride: true`
- For all other cases: returns user's own farm from `onboardingStatus`, `isOverride: false`
- Composes `useAuth`, `useUserRole`, and `useActiveFarmStore`

Installed `zustand` v5 as a new dependency (was listed in CLAUDE.md tech stack but not in package.json).

### Task 2: Create FarmSelector and integrate into Header

Created `src/components/FarmSelector.tsx` -- a `React.memo` wrapped component using Headless UI v2 `Listbox`:
- Queries all farms via PowerSync: `SELECT id, name FROM farms ORDER BY name ASC`
- Builds options list with own farm first (labeled `(my farm)`)
- On selection: calls `setActiveFarm` for other farms, `clearOverride` for own farm
- Shows `BuildingOfficeIcon` + farm name + `ChevronUpDownIcon` in button
- Yellow `(viewing)` indicator when override is active
- Dark theme dropdown: `bg-gray-800`, `border-gray-700`, `data-[focus]:bg-gray-700`, `data-[selected]:bg-[#5f7248]/30`

Updated `src/components/Header.tsx`:
- Added imports for `useUserRole`, `hasPermission`, and `FarmSelector`
- Derives `canCrossFarm` from `hasPermission(role, 'cross_farm_access')`
- When `canCrossFarm` is true: renders `<FarmSelector />` in place of static farm name
- When false: keeps existing static `farmName` display unchanged

## Pending: PowerSync Dashboard Sync Rules

The PowerSync Dashboard sync rules for the `farms` table must be verified manually to ensure super_admin users can see all farms (not just their own). This was a checkpoint task in the plan that was skipped per instructions. Without this, the FarmSelector dropdown query may only return the super_admin's own farm.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing zustand dependency**
- **Found during:** Task 1
- **Issue:** `zustand` was listed in CLAUDE.md tech stack but not in `package.json`, causing `TS2307: Cannot find module 'zustand'`
- **Fix:** Ran `npm install zustand` to add zustand v5 as a dependency
- **Files modified:** package.json, package-lock.json
- **Commit:** ec63d2c

## Verification Results

- `npx tsc -b --noEmit`: PASSED (zero errors)
- activeFarmStore.ts: exports `useActiveFarmStore` with `setActiveFarm` and `clearOverride` actions
- useActiveFarm.ts: returns `{ farmId, farmName, isOverride }` with super_admin override logic
- FarmSelector.tsx: renders Listbox dropdown querying farms table, wrapped in React.memo
- Header.tsx: conditionally renders FarmSelector when `hasPermission(role, 'cross_farm_access')` is true

## Commits

| Hash | Message | Files |
|------|---------|-------|
| ec63d2c | feat(04-03): add activeFarmStore and useActiveFarm hook | activeFarmStore.ts, useActiveFarm.ts, package.json, package-lock.json |
| bd3db76 | feat(04-03): add FarmSelector dropdown and integrate into Header | FarmSelector.tsx, Header.tsx |

## Self-Check: PASSED

- FOUND: src/stores/activeFarmStore.ts
- FOUND: src/hooks/useActiveFarm.ts
- FOUND: src/components/FarmSelector.tsx
- FOUND: src/components/Header.tsx
- FOUND: .planning/phases/04-permission-enforcement/04-03-SUMMARY.md
- FOUND: commit ec63d2c
- FOUND: commit bd3db76
