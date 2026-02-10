---
phase: 01-session-stability
plan: 01
subsystem: auth
tags: [react, supabase, powersync, timeout, promise-race, offline-first]

# Dependency graph
requires: []
provides:
  - "Auth initialization with 5-second RPC timeout via Promise.race"
  - "Retry UI when onboarding status RPC fails"
  - "Spinner-only loading screens with slow-load detection across auth/db init"
affects: [01-session-stability, 02-security-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.race timeout pattern for RPC calls"
    - "Slow-load detection with useState + useEffect 5-second timer"
    - "Retry UI pattern with ArrowPathIcon + isRetrying state"

key-files:
  created: []
  modified:
    - src/lib/AuthProvider.tsx
    - src/components/RequireOnboarded.tsx
    - src/components/RequireAuth.tsx
    - src/lib/PowerSyncContext.tsx
    - src/pages/onboarding/ProfilePage.tsx

key-decisions:
  - "Promise.race with 5s timeout instead of AbortController -- simpler, null result triggers retry UI"
  - "Extracted PowerSyncLoadingScreen to a small component for clean useState/useEffect lifecycle"
  - "Simplified RequireOnboarded null-status fallback to Navigate to /auth/phone for TypeScript narrowing"

patterns-established:
  - "Promise.race timeout: wrap slow RPC calls with Promise.race([call(), new Promise(resolve => setTimeout(() => resolve(null), 5000))])"
  - "Slow-load message: useState(false) + useEffect with 5s setTimeout, show 'Taking longer than usual...' conditionally"
  - "Retry UI: ArrowPathIcon + 'Something went wrong' + 'Tap to try again' button with isRetrying spinner"

# Metrics
duration: 4min
completed: 2026-02-10
---

# Phase 1 Plan 1: Auth Session Recovery Summary

**Auth RPC timeout via Promise.race with retry UI on failure and spinner-only loading screens with slow-load detection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-10T06:01:03Z
- **Completed:** 2026-02-10T06:04:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Auth initialization resolves within 5 seconds even when `get_onboarding_status` RPC hangs (Promise.race timeout)
- RequireOnboarded shows a retry button when RPC fails instead of hanging on an infinite spinner
- All four loading screens (RequireAuth, RequireOnboarded, PowerSyncContext, ProfilePage) now show spinner-only, with "Taking longer than usual..." after 5 seconds
- PowerSyncContext loading screen uses dark theme background (`bg-gray-900`) instead of default white flash

## Task Commits

Each task was committed atomically:

1. **Task 1: Add timeout and offline-first fallback to AuthProvider initialization** - `216ead3` (feat)
2. **Task 2: Update RequireOnboarded to handle null status after auth ready + clean up all loading screens** - `148aa1a` (feat)

## Files Created/Modified
- `src/lib/AuthProvider.tsx` - Added Promise.race with 5s timeout around fetchOnboardingStatus in INITIAL_SESSION, SIGNED_IN, USER_UPDATED handlers
- `src/components/RequireOnboarded.tsx` - Added retry UI for null onboardingStatus, slow-load detection, removed "Checking account status..." text
- `src/components/RequireAuth.tsx` - Added slow-load detection, removed "Loading..." text
- `src/lib/PowerSyncContext.tsx` - Extracted PowerSyncLoadingScreen component with slow-load detection, removed "Initializing database..." text, fixed dark theme background
- `src/pages/onboarding/ProfilePage.tsx` - Removed "Loading..." text from guard spinner

## Decisions Made
- Used Promise.race with null fallback instead of AbortController -- simpler pattern, null result feeds directly into RequireOnboarded's retry UI
- Extracted PowerSyncLoadingScreen into a small function component to properly scope useState/useEffect for slow-load detection
- Simplified the final null-status guard in RequireOnboarded to just check `!onboardingStatus` (not `!onboardingStatus && !session`) for clean TypeScript narrowing -- the `!onboardingStatus && session` case is already handled by the retry UI above

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript narrowing error in RequireOnboarded**
- **Found during:** Task 2 (RequireOnboarded null handling)
- **Issue:** TypeScript could not narrow `onboardingStatus` through two separate conditional checks (`!onboardingStatus && session` followed by `!onboardingStatus && !session`), resulting in TS18047 errors on lines 82 and 89
- **Fix:** Simplified the second guard to just `!onboardingStatus` (logically equivalent since the `session` case is handled first), enabling proper TypeScript narrowing
- **Files modified:** src/components/RequireOnboarded.tsx
- **Verification:** `npx tsc -b --noEmit` passes with zero errors
- **Committed in:** 148aa1a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript narrowing fix. No scope creep. Logically equivalent behavior.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth timeout and retry UI complete, ready for Plan 02 (error classification in PowerSync connector) and Plan 03 (console.log cleanup)
- The null onboardingStatus path is now handled gracefully -- users will see a retry screen instead of an infinite spinner
- All loading screens follow consistent spinner-only pattern with slow-load detection

## Self-Check: PASSED

All 6 files verified present. Both task commits (216ead3, 148aa1a) verified in git log.

---
*Phase: 01-session-stability*
*Completed: 2026-02-10*
