---
phase: "04"
plan: "01"
subsystem: "permission-enforcement"
tags: [route-guard, navigation-filtering, role-based-access]
dependency-graph:
  requires: [permissions.ts, useUserRole.ts]
  provides: [RequireRole.tsx, role-filtered-navigation]
  affects: [App.tsx, SideMenu.tsx]
tech-stack:
  added: []
  patterns: [route-guard-outlet, role-based-nav-filtering]
key-files:
  created:
    - src/components/RequireRole.tsx
  modified:
    - src/App.tsx
    - src/components/SideMenu.tsx
key-decisions:
  - "RequireRole returns null during loading (not redirect) to avoid flash-redirect while PowerSync loads"
  - "Only /subscription route protected by RequireRole — other routes accessible to all authenticated users"
  - "NavItem interface with optional requiredAction field for extensible per-item permission checks"
metrics:
  duration: "2min"
  completed: "2026-02-10"
---

# Phase 4 Plan 1: RequireRole Route Guard + SideMenu Navigation Filtering Summary

**One-liner:** RequireRole route guard with three-branch logic (loading/unauthorized/authorized) protecting /subscription, plus role-filtered SideMenu navigation using hasPermission checks.

## What Was Done

### Task 1: RequireRole Route Guard + App.tsx Wiring
- Created `src/components/RequireRole.tsx` following the same Outlet pattern as RequireAuth.tsx
- Three-branch logic: `role === null` returns null (loading), `!hasPermission` redirects to fallbackPath, authorized renders children or Outlet
- Accepts `action: Action` prop (from permissions.ts), optional `fallbackPath` (defaults to `/`)
- Updated `src/App.tsx` to import RequireRole and wrap `/subscription` route with `<RequireRole action="manage_farm" />`
- RequireRole sits inside the AppLayout route group, between AppLayout and the subscription route
- Commit: `e22268f`

### Task 2: SideMenu Navigation Filtering
- Added `useUserRole` and `hasPermission` imports to SideMenu
- Created `NavItem` interface with optional `requiredAction?: Action` field
- Added `requiredAction: 'manage_farm'` to the Subscription nav item only
- Filter navItems via `visibleItems` array using `hasPermission(role, item.requiredAction)`
- Replaced `navItems.map(...)` with `visibleItems.map(...)` in JSX
- Commit: `8a1aa5c`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | PASS - zero errors |
| RequireRole.tsx exists with three-branch logic | PASS |
| App.tsx wraps only /subscription with RequireRole | PASS |
| SideMenu.tsx filters navItems by requiredAction | PASS |
| Same action string 'manage_farm' in both places | PASS |

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | e22268f | feat(04-01): add RequireRole route guard and protect /subscription |
| 2 | 8a1aa5c | feat(04-01): filter SideMenu navigation items by user role |

## Self-Check: PASSED

- All 4 files verified present on disk
- Both commits (e22268f, 8a1aa5c) verified in git log
- TypeScript compilation: zero errors
