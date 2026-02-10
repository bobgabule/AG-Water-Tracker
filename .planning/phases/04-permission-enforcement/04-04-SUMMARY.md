---
phase: "04"
plan: "04"
subsystem: "permissions"
tags: [role-detection, sign-out-cleanup, powersync, zustand]
dependency-graph:
  requires: [04-01, 04-03]
  provides: [role-change-detection, sign-out-farm-cleanup]
  affects: [AppLayout, AuthProvider]
tech-stack:
  added: []
  patterns: [useRef-three-state, zustand-getState-in-callback]
key-files:
  created:
    - src/hooks/useRoleChangeDetector.ts
  modified:
    - src/components/AppLayout.tsx
    - src/lib/AuthProvider.tsx
decisions:
  - "Three-state ref (undefined | null | Role) for first-render detection vs role-loading vs known-role"
  - "Only known-to-different-known transitions trigger reload to avoid false positives"
  - "useActiveFarmStore.getState() pattern for Zustand access inside callback (not hook)"
metrics:
  duration: "2min"
  completed: "2026-02-11"
---

# Phase 4 Plan 4: Role Change Detection + Active Farm Store Cleanup Summary

Role change detector hook using three-state useRef pattern to detect server-side role transitions via PowerSync, plus Zustand store cleanup on sign-out.

## What Was Done

### Task 1: useRoleChangeDetector hook + AppLayout wiring

Created `src/hooks/useRoleChangeDetector.ts` -- a void hook that monitors the user's role from `useUserRole()` (PowerSync-backed) and detects actual role transitions.

**Three-state ref pattern:**
- `undefined` = first render (store initial, skip)
- `null` = data not yet loaded or sign-out in progress (skip)
- `Role` = known role value

Only triggers on `known-role-A -> different-known-role-B` transitions. On detection, calls `disconnectAndClear()` then `window.location.reload()` to force a full data refresh with the new role's sync rules.

Wired into `AppLayoutContent` (inside `PowerSyncProvider` scope) in `AppLayout.tsx`.

### Task 2: Active farm store cleanup on sign-out

Updated `AuthProvider.tsx` signOut callback to call `useActiveFarmStore.getState().clearOverride()` after `disconnectAndClear()` and before `localStorage.removeItem()`. Uses Zustand's `getState()` pattern since it's inside a callback, not a React component render.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- `npx tsc -b --noEmit`: zero errors
- `npx vite build`: success (21.8s)
- useRoleChangeDetector uses `useRef<Role | null | undefined>(undefined)` pattern
- Hook called inside `AppLayoutContent` (PowerSyncProvider scope)
- signOut calls `useActiveFarmStore.getState().clearOverride()` in correct position

## Commits

| Hash | Message |
|------|---------|
| ebbfcfa | feat(04-04): role change detection and active farm store cleanup on sign-out |

## Self-Check: PASSED

- [x] src/hooks/useRoleChangeDetector.ts -- FOUND
- [x] src/components/AppLayout.tsx -- FOUND
- [x] src/lib/AuthProvider.tsx -- FOUND
- [x] Commit ebbfcfa -- FOUND
