---
phase: 05-grower-onboarding
plan: 01
subsystem: onboarding
tags: [powersync-schema, otp, navigation, route-guards]
dependency-graph:
  requires: []
  provides:
    - "Clean PowerSync farms schema (no stale columns)"
    - "6-digit OTP input component"
    - "Forward guard for onboarding routes"
  affects:
    - "src/lib/powersync-schema.ts"
    - "src/components/auth/OtpInput.tsx"
    - "src/pages/auth/VerifyPage.tsx"
    - "src/pages/onboarding/CreateFarmPage.tsx"
    - "src/pages/onboarding/ProfilePage.tsx"
    - "src/App.tsx"
    - "src/components/RequireNotOnboarded.tsx"
tech-stack:
  added: []
  patterns:
    - "Configurable OTP length via prop with default"
    - "Forward guard pattern (inverse of RequireOnboarded)"
key-files:
  created:
    - "src/components/RequireNotOnboarded.tsx"
  modified:
    - "src/lib/powersync-schema.ts"
    - "src/components/auth/OtpInput.tsx"
    - "src/pages/auth/VerifyPage.tsx"
    - "src/pages/onboarding/CreateFarmPage.tsx"
    - "src/pages/onboarding/ProfilePage.tsx"
    - "src/App.tsx"
decisions:
  - "OtpInput uses configurable length prop (default 6) for reusability"
  - "RequireNotOnboarded only redirects when BOTH hasProfile AND hasFarmMembership are true"
  - "CreateFarmPage back navigates to profile (not sign out) for non-destructive UX"
metrics:
  duration: "4min"
  completed: "2026-02-11"
  tasks: 4
  files-changed: 7
---

# Phase 5 Plan 1: Fix Onboarding Flow Issues Summary

PowerSync schema cleanup, 6-digit OTP support, back-button navigation fix, and forward guard for onboarding routes.

## What Was Done

### Task 1: Fix PowerSync schema -- remove farms.invite_code
**Commit:** `db8856e`

Removed the stale `invite_code` column from the `farms` table definition in `powersync-schema.ts`. Migration 024 had already dropped this column from the database, leaving the local schema out of sync. Verified zero remaining `invite_code` references across `src/`.

### Task 2: Fix OTP input to support 6-digit codes
**Commit:** `d58ee0a`

Updated `OtpInput.tsx` to accept a configurable `length` prop (default: 6) replacing all hardcoded `4` references. Updated `VerifyPage.tsx` to use 6-element arrays for code state, 6-digit auto-submit threshold, 6-digit code reset on error/resend, and 6-digit manual submit check. The `useOtpState` hook default also updated from 4 to 6. Aria labels now reflect the actual digit count.

### Task 3: Fix CreateFarmPage back button and ProfilePage polish
**Commit:** `f404d38`

Changed `CreateFarmPage` `handleBack` from calling `signOut()` to `navigate('/onboarding/profile', { replace: true })`. Button label changed from "Sign out" to "Back". Removed unused `signOut` import. Added `role="alert"` and `aria-live="polite"` to `ProfilePage` error display div for accessibility parity with `CreateFarmPage`.

### Task 4: Add forward guard for onboarding routes
**Commit:** `31bcdfe`

Created `RequireNotOnboarded` component following the exact pattern of `RequireOnboarded` (its inverse). Redirects to `/` when both `hasProfile` and `hasFarmMembership` are true. Does not redirect during loading/null states. Wrapped `/onboarding/*` routes in `App.tsx` with `RequireNotOnboarded` inside `RequireAuth`.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` passes | PASS |
| PowerSync farms table has no invite_code | PASS |
| OTP input defaults to 6 digits | PASS |
| CreateFarmPage back button navigates to /onboarding/profile | PASS |
| ProfilePage error div has role="alert" and aria-live="polite" | PASS |
| RequireNotOnboarded exists and wraps onboarding routes | PASS |
| Already-onboarded user visiting /onboarding/* redirected to / | PASS (logic trace) |

## Self-Check: PASSED

All 8 files verified present on disk. All 4 commit hashes verified in git log.
