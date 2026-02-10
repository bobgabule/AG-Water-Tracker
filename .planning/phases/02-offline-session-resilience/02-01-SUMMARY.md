---
phase: 02-offline-session-resilience
plan: 01
subsystem: auth
tags: [offline, localStorage, caching, powersync, supabase-auth, error-handling]

# Dependency graph
requires:
  - phase: 01-session-stability
    provides: "AuthProvider with Promise.race timeout pattern, debugLog utilities"
provides:
  - "Onboarding status localStorage cache with offline fallback"
  - "PowerSync connector with correct retryable vs permanent error semantics"
affects: [02-02, offline-sync, session-resilience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "localStorage cache-aside pattern: cache on success, serve from cache on failure"
    - "isAuthRetryableFetchError guard for PowerSync connector error branching"

key-files:
  created: []
  modified:
    - src/lib/AuthProvider.tsx
    - src/lib/powersync-connector.ts

key-decisions:
  - "Cache onboarding status in localStorage (not sessionStorage) so it persists across tabs and browser restarts"
  - "Return null for permanent auth errors instead of throwing, letting PowerSync stop gracefully"
  - "Clear onboarding cache before state setters in signOut to ensure cleanup even if state throws"

patterns-established:
  - "Cache-aside with localStorage: try RPC, cache success, fallback to cache on failure"
  - "PowerSync error semantics: throw for retryable (network), return null for permanent (auth revoked)"

# Metrics
duration: 8min
completed: 2026-02-10
---

# Phase 2 Plan 1: Offline Session Resilience Summary

**localStorage onboarding cache with offline fallback and PowerSync connector error semantics fix (retryable vs permanent)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-10T07:14:44Z
- **Completed:** 2026-02-10T07:22:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Onboarding status is now cached in localStorage on successful RPC calls, allowing offline users to bypass the "Something went wrong" retry screen
- PowerSync connector properly distinguishes network/5xx errors (retryable -- throws) from permanent auth failures (returns null -- stops connecting)
- Sign-out clears the onboarding cache before resetting state, preventing stale data for subsequent logins

## Task Commits

Each task was committed atomically:

1. **Task 1: Add onboarding status caching with offline fallback** - `c9300f8` (feat)
2. **Task 2: Fix connector error semantics for retryable vs permanent auth failures** - `3276520` (fix)

## Files Created/Modified
- `src/lib/AuthProvider.tsx` - Added ONBOARDING_CACHE_KEY constant, localStorage.setItem on RPC success, localStorage.getItem fallback in both error branches, localStorage.removeItem in signOut
- `src/lib/powersync-connector.ts` - Added isAuthRetryableFetchError import, restructured fetchCredentials to throw for retryable errors and return null for permanent auth failures

## Decisions Made
- Used `localStorage` (not `sessionStorage`) so the cache persists across tabs and browser restarts -- important for field agents who may close and reopen the app offline
- Returning `null` from `fetchCredentials` instead of throwing signals "not authenticated" to PowerSync, which stops the sync loop gracefully without infinite retries
- Placed `localStorage.removeItem` before state setters in `signOut` to ensure cache is cleared even if `setSession`/`setUser` throws

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Onboarding cache + connector error semantics provide the foundation for full offline session resilience
- Plan 02-02 can build on this with additional offline data caching and sync status awareness
- The cache-aside pattern established here can be reused for other RPC-dependent data

## Self-Check: PASSED

- All 2 source files exist on disk
- All 2 task commits verified in git log (c9300f8, 3276520)
- must_haves key_links verified: ONBOARDING_CACHE_KEY (5 refs), isAuthRetryableFetchError (2 refs)
- TypeScript compilation: zero errors

---
*Phase: 02-offline-session-resilience*
*Completed: 2026-02-10*
