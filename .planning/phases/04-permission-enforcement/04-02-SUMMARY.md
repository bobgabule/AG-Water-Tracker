---
phase: "04"
plan: "02"
subsystem: "permission-enforcement"
tags: [permissions, rbac, ui-gating, well-creation]
dependency-graph:
  requires: [03-01, 03-02]
  provides: [role-gated-well-creation]
  affects: [DashboardPage, WellListPage]
tech-stack:
  patterns: [conditional-rendering, defense-in-depth, useCallback-dependency-gating]
key-files:
  modified:
    - src/pages/DashboardPage.tsx
    - src/pages/WellListPage.tsx
  referenced:
    - src/lib/permissions.ts
    - src/hooks/useUserRole.ts
decisions:
  - Conditional rendering (not CSS display:none) for all permission gates
  - Defense-in-depth pattern: UI gate + handler gate + write guard in DashboardPage
  - Long-press handler gated at function level (early return) rather than removing callback from MapView
metrics:
  duration: "2min"
  completed: "2026-02-11"
  tasks: 2
  files-modified: 2
---

# Phase 4 Plan 2: Role-gated Well Creation UI Summary

Gate well creation UI elements and write operations by `create_well` permission so meter checkers can view wells and record readings but cannot create new wells.

## What Was Done

### Task 1: Gate well creation UI and writes in DashboardPage

Added `useUserRole` and `hasPermission` imports. Derived `canCreateWell` flag from `hasPermission(role, 'create_well')`. Applied three permission gates:

1. **New Well FAB**: Wrapped with `{canCreateWell && (...)}` conditional rendering -- button does not render at all for unauthorized roles.
2. **Long-press handler**: Added `if (!canCreateWell) return;` early exit with `canCreateWell` in the `useCallback` dependency array.
3. **handleSaveWell (defense-in-depth)**: Added `if (!hasPermission(role, 'create_well'))` check at the top of the save function, logging via `debugError` and returning early. Added `role` to the dependency array.

Map click handler (`handleMapClick`) left ungated per plan -- it only sets a location marker, not a creation flow.

### Task 2: Gate well creation UI in WellListPage

Added `useUserRole` and `hasPermission` imports. Derived `canCreateWell` flag. Wrapped the "New Well" button with `{canCreateWell && (...)}` conditional rendering. The "Well Map" button remains visible to all roles. Layout uses `justify-between` which gracefully handles a single child.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc -b --noEmit`: PASSED (zero errors)
- DashboardPage.tsx: 3 permission gates confirmed (New Well button, long-press handler, handleSaveWell)
- WellListPage.tsx: 1 permission gate confirmed (New Well button)
- Both files use `hasPermission(role, 'create_well')` consistently
- All gating uses conditional rendering, no CSS-based hiding

## Commits

| Hash | Message | Files |
|------|---------|-------|
| bf1baa8 | feat(04-02): gate well creation UI by create_well permission | DashboardPage.tsx, WellListPage.tsx |

## Self-Check: PASSED

- FOUND: src/pages/DashboardPage.tsx
- FOUND: src/pages/WellListPage.tsx
- FOUND: .planning/phases/04-permission-enforcement/04-02-SUMMARY.md
- FOUND: commit bf1baa8
