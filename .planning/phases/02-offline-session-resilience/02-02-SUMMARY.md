---
phase: 02-offline-session-resilience
plan: 02
subsystem: auth
tags: [session-expired, forced-signout, connectivity-guard, offline, supabase-auth, useOnlineStatus]

# Dependency graph
requires:
  - phase: 02-offline-session-resilience
    plan: 01
    provides: "Onboarding cache, PowerSync connector error semantics, signOut cleanup ordering"
provides:
  - "Session expired state tracking with user-initiated vs forced sign-out distinction"
  - "Session expired messaging UI in RequireAuth"
  - "Pre-submit connectivity guards on PhonePage and VerifyPage"
affects: [03-role-based-access, onboarding, auth-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRef flag to distinguish user-initiated from forced sign-out events"
    - "Pre-submit connectivity guard with useOnlineStatus + navigator.onLine fallback in catch"

key-files:
  created: []
  modified:
    - src/lib/AuthProvider.tsx
    - src/components/RequireAuth.tsx
    - src/pages/auth/PhonePage.tsx
    - src/pages/auth/VerifyPage.tsx

key-decisions:
  - "useRef for userInitiatedSignOut (not state) since it only needs to be read synchronously during auth events"
  - "Session expired UI shown in RequireAuth rather than redirecting to a separate route -- simpler, no URL change"
  - "Dual connectivity check pattern: useOnlineStatus pre-submit guard + navigator.onLine catch fallback for WiFi-without-internet"

patterns-established:
  - "Forced sign-out detection: set ref true before signOut, check ref in SIGNED_OUT handler"
  - "Connectivity guard: check useOnlineStatus before network calls, check navigator.onLine in catch for post-check failures"

# Metrics
duration: 5min
completed: 2026-02-10
---

# Phase 2 Plan 2: Session Expired Messaging & Auth Connectivity Guards Summary

**Session expired messaging for forced sign-outs (revoked accounts) and connectivity guards on PhonePage/VerifyPage with clear "no internet" errors**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-10T07:26:40Z
- **Completed:** 2026-02-10T07:31:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Revoked users whose token refresh fails now see "Your session has expired. Please sign in again." with a Sign In button, instead of being silently redirected
- Normal explicit sign-outs still redirect to the phone page with no expired message (userInitiatedSignOut ref prevents false positives)
- PhonePage blocks OTP submission when offline with "No internet connection. Connect to the internet to sign in."
- VerifyPage blocks verification and resend when offline with clear connectivity error messages
- All catch blocks include navigator.onLine fallback for cases where the pre-check passed but the request still failed (WiFi without internet)

## Task Commits

Each task was committed atomically:

1. **Task 1: Track forced sign-out and expose session-expired state** - `83e5153` (feat)
2. **Task 2: Add connectivity guards to registration pages** - `141cd77` (feat)

## Files Created/Modified
- `src/lib/AuthProvider.tsx` - Added sessionExpired state, userInitiatedSignOut ref, clearSessionExpired callback, updated SIGNED_OUT handler and signOut method, expanded AuthContextType interface
- `src/components/RequireAuth.tsx` - Added ExclamationTriangleIcon import, sessionExpired/clearSessionExpired destructuring, session expired UI with yellow warning icon and Sign In button
- `src/pages/auth/PhonePage.tsx` - Added useOnlineStatus import and hook call, pre-submit connectivity check in handleSubmit, navigator.onLine fallback in catch block
- `src/pages/auth/VerifyPage.tsx` - Added useOnlineStatus import and hook call, pre-submit connectivity checks in handleVerify and handleResend, navigator.onLine fallback in both catch blocks

## Decisions Made
- Used `useRef` for `userInitiatedSignOut` rather than state because it only needs synchronous reads during auth event handling -- no re-render needed
- Rendered session expired UI directly in RequireAuth rather than navigating to a separate route -- keeps it simple, avoids URL-based state, and clicking "Sign In" naturally falls through to the Navigate redirect
- Dual connectivity check pattern (useOnlineStatus + navigator.onLine in catch) handles both fully-offline and WiFi-without-internet scenarios

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 02 (Offline Session Resilience) is now complete -- all 2 plans executed
- Auth flow now handles: offline onboarding cache (02-01), connector error semantics (02-01), session expired messaging (02-02), and auth page connectivity guards (02-02)
- Ready to proceed to Phase 03 (Role-Based Access) which builds on the stabilized auth foundation

## Self-Check: PASSED

- All 4 source files exist on disk
- All 2 task commits verified in git log (83e5153, 141cd77)
- must_haves key_links verified: sessionExpired (3 refs in AuthProvider), "session has expired" (1 ref in RequireAuth), useOnlineStatus (2 refs in PhonePage, 2 refs in VerifyPage)
- TypeScript compilation: zero errors

---
*Phase: 02-offline-session-resilience*
*Completed: 2026-02-10*
