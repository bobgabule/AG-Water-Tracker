---
phase: "05-grower-onboarding"
plan: "02"
subsystem: "onboarding-routing"
tags: [routing, redirect, dead-code-cleanup, retry-logic]
dependency-graph:
  requires: ["05-01"]
  provides: ["consistent-routing", "clean-codebase", "retry-resilience"]
  affects: ["src/pages/auth/VerifyPage.tsx", "src/pages/onboarding/CreateFarmPage.tsx"]
tech-stack:
  added: []
  patterns: ["retry-with-backoff", "centralized-routing-via-resolveNextRoute"]
key-files:
  created: []
  modified:
    - "src/pages/auth/VerifyPage.tsx"
    - "src/pages/onboarding/CreateFarmPage.tsx"
decisions:
  - "VerifyPage redirect uses resolveNextRoute(onboardingStatus) for consistent routing across all entry points"
  - "CreateFarmPage navigates to '/' instead of '/app/dashboard' for canonical route handling"
  - "3-attempt retry with 500ms delay for refreshOnboardingStatus is sufficient; self-corrects on next app load if all fail"
metrics:
  duration: "2min"
  completed: "2026-02-11"
---

# Phase 5 Plan 2: Verify Routing & Clean Up Dead Code Summary

Consistent redirect logic via resolveNextRoute, verified edge cases, 3-attempt retry on CreateFarmPage, zero dead code references to old invite system.

## What Was Done

### Task 1: Fix VerifyPage already-logged-in redirect
- Replaced hardcoded `navigate('/')` with `resolveNextRoute(onboardingStatus)` for the already-logged-in redirect
- Added `onboardingStatus` to `useAuth()` destructuring and useEffect dependency array
- Eliminates unnecessary double-redirect (VerifyPage -> `/` -> RequireOnboarded -> onboarding route)
- Commit: `d2df08d`

### Task 2: Verify resolveNextRoute handles all edge cases
- Traced all 5 onboarding states through `resolveNextRoute`:
  - `null` -> `/auth/phone` (correct)
  - `{ hasProfile: false, hasFarmMembership: false }` -> `/onboarding/profile` (correct)
  - `{ hasProfile: true, hasFarmMembership: false }` -> `/onboarding/farm/create` (correct)
  - `{ hasProfile: true, hasFarmMembership: true }` -> `/app/dashboard` (correct)
  - `{ hasProfile: false, hasFarmMembership: true }` -> `/onboarding/profile` (correct -- edge case handled by priority order)
- Verified `isOnboardingComplete` returns true only when both flags are true
- Confirmed alignment with `RequireOnboarded.tsx` lines 93-101 (same priority: profile check -> farm check)
- No code changes needed -- verification-only task

### Task 3: Clean up dead code references to old invite code UI
- Searched `src/` for: `join_farm`, `JoinFarm`, `FarmChoice`, `invite_code`, `joinFarm`, `farm/join`, `onboarding/join`
- Zero matches found across all patterns
- `src/pages/onboarding/index.ts` exports only `ProfilePage` and `CreateFarmPage` (no old pages)
- Only 3 files in `src/pages/onboarding/`: `index.ts`, `CreateFarmPage.tsx`, `ProfilePage.tsx`
- Codebase is clean -- no dead code to remove

### Task 4: Fix CreateFarmPage refresh retry
- Replaced single try/catch with 3-attempt retry loop with 500ms delay between retries
- Changed navigation from `/app/dashboard` to `/` (canonical route per App.tsx)
- If all retries fail, navigation still proceeds -- status self-corrects on next INITIAL_SESSION
- Verified all 4 partial onboarding resume scenarios:
  - Profile created, returns -> lands on CreateFarmPage (resolveNextRoute returns `/onboarding/farm/create`)
  - OTP only, returns -> lands on ProfilePage (resolveNextRoute returns `/onboarding/profile`)
  - Fully onboarded, refreshes -> stays on dashboard (RequireOnboarded passes)
  - Farm created, refresh fails -> retries 3x, then navigates; INITIAL_SESSION handler self-corrects
- Commit: `cd98c38`

## Phase 5 Success Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| SC1: New user OTP -> profile -> farm -> dashboard | Met | VerifyPage calls `resolveNextRoute(status)` after OTP verify; flow polished in 05-01 |
| SC2: Unknown phone auto-enters grower flow | Met | resolveNextRoute sends new users to `/onboarding/profile`; no choice screen exists |
| SC3: Partial onboarding resumes from correct step | Met | Server-driven via `get_onboarding_status` RPC; all 4 scenarios traced and verified |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `npx tsc -b --noEmit` passes with zero errors
2. VerifyPage uses `resolveNextRoute(onboardingStatus)` for already-logged-in redirect
3. resolveNextRoute handles all 5 states correctly and aligns with RequireOnboarded
4. No dead code references to old invite code UI in `src/` (zero grep matches)
5. CreateFarmPage has 3-attempt retry logic for refreshOnboardingStatus
6. All three Phase 5 success criteria verified

## Commits

| Hash | Message |
|---|---|
| `d2df08d` | fix(05-02): use resolveNextRoute for VerifyPage already-logged-in redirect |
| `cd98c38` | fix(05-02): add retry logic to CreateFarmPage refreshOnboardingStatus |

## Self-Check: PASSED

- [x] src/pages/auth/VerifyPage.tsx exists
- [x] src/pages/onboarding/CreateFarmPage.tsx exists
- [x] .planning/phases/05-grower-onboarding/05-02-SUMMARY.md exists
- [x] Commit d2df08d exists in git log
- [x] Commit cd98c38 exists in git log
