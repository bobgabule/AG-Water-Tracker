---
phase: 01-session-stability
plan: 03
subsystem: database, auth
tags: [postgres, security-definer, security-invoker, private-schema, debug-logging, localStorage]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Auth session recovery with timeout handling"
  - phase: 01-02
    provides: "Error boundaries for crash recovery"
provides:
  - "Private schema for all SECURITY DEFINER functions (not callable via PostgREST API)"
  - "SECURITY INVOKER public wrappers maintaining identical RPC signatures"
  - "debugLog/debugWarn/debugError utility gated behind localStorage.__ag_debug"
  - "Zero production console output (no sensitive data leakage)"
affects: [02-role-access, 03-invite-flow, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [private-schema-pattern, debug-log-gating]

key-files:
  created:
    - supabase/migrations/020_security_definer_private_schema.sql
    - src/lib/debugLog.ts
  modified:
    - src/lib/powersync-connector.ts
    - src/lib/powersync.ts
    - src/lib/AuthProvider.tsx
    - src/pages/DashboardPage.tsx
    - src/components/MapView.tsx
    - src/components/AddUserModal.tsx
    - src/hooks/useGeolocation.ts

key-decisions:
  - "Private schema pattern: private._impl() with SECURITY DEFINER + public wrapper with SECURITY INVOKER"
  - "generate_random_code fully private (no public wrapper) to prevent API exposure of helper"
  - "Debug logging uses localStorage.__ag_debug flag checked once at module load (not per-call)"
  - "Two HIGH-sensitivity upsert logs deleted entirely rather than gated (row data exposure)"

patterns-established:
  - "Private schema: All future SECURITY DEFINER functions must go in private schema with public INVOKER wrappers"
  - "Debug logging: Use debugLog/debugWarn/debugError from src/lib/debugLog.ts instead of console.* in all src/ files"
  - "search_path: All private functions use SET search_path = '' with fully qualified table references"

# Metrics
duration: 8min
completed: 2026-02-10
---

# Phase 1 Plan 3: Security & Debug Logging Summary

**Private schema for all 8 SECURITY DEFINER functions preventing PostgREST API exposure, plus localStorage-gated debug logging replacing all console statements**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-10T06:08:49Z
- **Completed:** 2026-02-10T06:16:36Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- All 8 SECURITY DEFINER functions moved to private schema with SECURITY INVOKER public wrappers
- generate_random_code helper fully removed from public API (no wrapper)
- Created debugLog.ts utility gated behind localStorage.__ag_debug flag
- Zero console.log, console.warn, or console.error statements remaining in src/ (except inside debugLog.ts itself)
- 2 HIGH-sensitivity upsert data logs deleted entirely (prevented row data exposure)
- All table references fully qualified with search_path = '' per Supabase security recommendation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SQL migration to move SECURITY DEFINER functions to private schema** - `bae5fe3` (feat)
2. **Task 2: Create debug logging utility and replace console statements in core files** - `fb44238` (feat)
3. **Task 3: Replace console statements in UI components and hooks** - `9e00427` (feat)

## Files Created/Modified
- `supabase/migrations/020_security_definer_private_schema.sql` - Migration: private schema creation, 8 private._impl() functions, 7 public INVOKER wrappers, drop old functions
- `src/lib/debugLog.ts` - Debug logging utility with localStorage.__ag_debug gate (debugLog, debugWarn, debugError)
- `src/lib/powersync-connector.ts` - Replaced console.error/warn with debugError/debugWarn, deleted 2 sensitive upsert logs, removed unused result variable
- `src/lib/powersync.ts` - Replaced console.log with debugLog for sync status
- `src/lib/AuthProvider.tsx` - Replaced 5 console.error calls with debugError (including signOut auth-sensitive errors)
- `src/pages/DashboardPage.tsx` - Replaced 2 console.error with debugError
- `src/components/MapView.tsx` - Replaced console.warn with debugWarn
- `src/components/AddUserModal.tsx` - Replaced 2 console.error with debugError
- `src/hooks/useGeolocation.ts` - Replaced 2 console.warn with debugWarn

## Decisions Made
- **Private schema pattern:** All SECURITY DEFINER implementations live in `private.{name}_impl()` with `SECURITY DEFINER` + `SET search_path = ''`. Public functions are `SECURITY INVOKER` SQL wrappers that simply call the private version. This prevents direct PostgREST API invocation of privileged functions.
- **generate_random_code fully private:** This helper is only used by other private functions. No public wrapper was created since there is no legitimate client-side use case for random code generation.
- **Debug logging at module load:** The `DEBUG` constant is evaluated once when `debugLog.ts` is imported (`localStorage.getItem('__ag_debug') === 'true'`). This avoids per-call localStorage reads but means toggling requires a page reload.
- **Deleted vs gated:** The 2 upsert data logs that dumped full row data and response payloads were deleted entirely rather than gated, because even in debug mode, logging full database row contents to console is an unnecessary exposure vector.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused 'result' variable in powersync-connector.ts**
- **Found during:** Task 2 (replacing console statements in core files)
- **Issue:** After deleting `console.log('[PowerSync] Upsert response...', result)`, the destructured `result` variable from `const { data: result, error } = ...` became unused, causing TypeScript error TS6133
- **Fix:** Changed destructuring to `const { error } = ...` (removed `data: result`)
- **Files modified:** src/lib/powersync-connector.ts
- **Verification:** `npx tsc -b --noEmit` passes with zero errors
- **Committed in:** fb44238 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial cleanup of unused variable left behind after log deletion. No scope creep.

## Issues Encountered
None

## User Setup Required
- Migration `020_security_definer_private_schema.sql` must be applied to the Supabase database via `supabase db push` or the Supabase dashboard migration runner
- No other external configuration required

## Next Phase Readiness
- Phase 1 (Session Stability) is complete: auth recovery, error boundaries, security hardening, and debug logging all in place
- Ready to proceed to Phase 2 (Role & Access Control)
- The private schema pattern established here should be followed for any future SECURITY DEFINER functions added in later phases

---
*Phase: 01-session-stability*
*Completed: 2026-02-10*

## Self-Check: PASSED

- All 3 created/modified files verified on disk
- All 3 task commits verified in git history (bae5fe3, fb44238, 9e00427)
