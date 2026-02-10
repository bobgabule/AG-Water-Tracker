---
status: diagnosed
trigger: "Session expired UI doesn't show when auth.sessions deleted server-side and user reloads"
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED - Race condition between stale JWT usage and Supabase SIGNED_OUT event
test: Traced execution through AuthProvider, GoTrueClient source, RequireOnboarded, RequireAuth
expecting: N/A - root cause confirmed
next_action: Document fix approach

## Symptoms

expected: App shows "Your session has expired. Please sign in again." with Sign In button
actual: App shows "Taking longer than usual..." spinner, then "Something went wrong / We couldn't load your account info / Tap to try again"
errors: RPC get_onboarding_status returns error (401/JWT invalid) but caught and treated as generic failure
reproduction: Delete auth.sessions from Supabase for a user, then reload the app in browser
started: Always been this way - race condition in initialization flow

## Eliminated

- hypothesis: Supabase never fires SIGNED_OUT when sessions are deleted server-side
  evidence: Supabase DOES fire SIGNED_OUT, but only when _callRefreshToken fails during auto-refresh tick or getSession with expired JWT. The event fires AFTER _initialize completes, via setTimeout(0) in _startAutoRefresh.
  timestamp: 2026-02-10T00:00:30Z

## Evidence

- timestamp: 2026-02-10T00:00:10Z
  checked: Supabase auth-js GoTrueClient.js getSession() (line 1091) and __loadSession() (lines 1178-1241)
  found: getSession() reads from localStorage only. If JWT has not expired (within 1hr lifetime minus 90s margin), it returns the stale session WITHOUT contacting the server. No SIGNED_OUT is fired.
  implication: AuthProvider receives a non-null stale session on reload even though server session is deleted.

- timestamp: 2026-02-10T00:00:15Z
  checked: GoTrueClient._recoverAndRefresh() (line 1871) called during _initialize()
  found: If JWT access token has NOT expired (expiresWithMargin=false), _recoverAndRefresh does NOT call _callRefreshToken. It simply returns without any server contact or SIGNED_OUT event.
  implication: During the common case (session deleted within the JWT's 1-hour lifetime), initialization completes without detecting the revocation.

- timestamp: 2026-02-10T00:00:20Z
  checked: GoTrueClient._startAutoRefresh() (line 2107) called from _handleVisibilityChange in _initialize finally block
  found: Schedules _autoRefreshTokenTick via setTimeout(0) AFTER initializePromise resolves. This means the auto-refresh tick runs on the NEXT event loop iteration after initialization.
  implication: The SIGNED_OUT event from a failed refresh will fire AFTER AuthProvider has already set state and triggered UI rendering.

- timestamp: 2026-02-10T00:00:25Z
  checked: AuthProvider.handleAuthStateChange INITIAL_SESSION handler (lines 147-169)
  found: When stale session is returned, authUser is non-null, so fetchOnboardingStatus() is called with the stale JWT. The RPC fails server-side (invalid JWT/session). Error is caught at line 83-96.
  implication: fetchOnboardingStatus returns null (or cached data), setting onboardingStatus to null/cached.

- timestamp: 2026-02-10T00:00:28Z
  checked: AuthProvider.fetchOnboardingStatus error handling (lines 78-128)
  found: On RPC error, function tries localStorage cache first (ONBOARDING_CACHE_KEY). If cache exists, returns cached OnboardingStatus (masking auth failure). If no cache, returns null. Does NOT distinguish auth errors from network/other errors.
  implication: TWO failure modes - (1) With cache: user briefly enters the app with stale data before SIGNED_OUT kicks in. (2) Without cache: onboardingStatus=null triggers RequireOnboarded error UI.

- timestamp: 2026-02-10T00:00:32Z
  checked: RequireOnboarded.tsx rendering logic (lines 49-85)
  found: When onboardingStatus=null AND session is non-null AND isFetchingOnboarding=false, shows "Something went wrong / We couldn't load your account info / Tap to try again" UI.
  implication: This error UI is shown INSTEAD of the session expired UI from RequireAuth, because RequireAuth has already passed (session is non-null at this point).

- timestamp: 2026-02-10T00:00:35Z
  checked: RequireAuth.tsx rendering logic (lines 44-78) and component hierarchy in App.tsx (lines 43-56)
  found: RequireAuth wraps RequireOnboarded. RequireAuth only shows session expired UI when session=null AND sessionExpired=true. But at initial render, session is still the stale non-null session.
  implication: RequireAuth passes through, RequireOnboarded catches the failure. The session expired UI is structurally blocked from showing until the deferred SIGNED_OUT fires.

- timestamp: 2026-02-10T00:00:38Z
  checked: EXPIRY_MARGIN_MS constant in auth-js constants.js
  found: EXPIRY_MARGIN_MS = 3 * 30000 = 90000ms = 90 seconds. Auto-refresh tick runs every 30 seconds.
  implication: If JWT was issued within last ~58.5 minutes (3600s - 90s margin), getSession returns it as valid. The auto-refresh tick will attempt refresh within 30 seconds max, but that gap creates the UX problem.

## Resolution

root_cause: |
  Race condition between Supabase auth initialization and the onboarding RPC call.

  When auth.sessions are deleted server-side and the user reloads:

  1. supabase.auth.getSession() returns the stale session from localStorage (no server contact
     if JWT hasn't expired, which is the common case within the 1-hour JWT lifetime).
  2. AuthProvider treats this as a valid session: sets user/session state, calls fetchOnboardingStatus().
  3. fetchOnboardingStatus() makes an RPC call with the stale JWT. The server rejects it.
  4. The RPC error is caught generically -- no distinction between auth failure vs network error.
     If cached onboarding data exists, it returns that (masking the problem further).
     If no cache, returns null.
  5. RequireAuth passes (session is non-null stale session) -> RequireOnboarded catches the
     null onboardingStatus and shows the "Something went wrong" retry UI.
  6. Eventually (next event loop tick), Supabase's auto-refresh-token-tick runs, tries to refresh
     the stale refresh token, fails, calls _removeSession() which fires SIGNED_OUT.
  7. SIGNED_OUT sets sessionExpired=true and session=null, causing a re-render that WOULD show
     the session expired UI -- but the user already saw the wrong error screen first.

  The core issue: AuthProvider makes RPC calls using a stale JWT before Supabase has validated
  the session server-side. The error handling treats all RPC failures identically (generic error
  or cache fallback), losing the signal that the session itself is invalid.

fix: |
  Recommended fix approach (from least to most invasive):

  **Option A: Detect auth errors in fetchOnboardingStatus (RECOMMENDED)**
  In fetchOnboardingStatus, check if the RPC error indicates an auth/JWT failure
  (HTTP 401, or error message containing "JWT" / "expired" / "invalid claim").
  When detected:
  - Do NOT fall back to cache
  - Do NOT return null (which triggers the generic error UI)
  - Instead, trigger the session expiry flow directly: call signOut() or set sessionExpired=true
  - Clear the stale session from state

  This is the most targeted fix. The key change is in AuthProvider.fetchOnboardingStatus:
  ```typescript
  if (error) {
    // Check if error is auth-related (expired/revoked session)
    const isAuthError = error.code === 'PGRST301' // JWT expired
      || error.message?.includes('JWT')
      || error.code === '401'
      || error.message?.includes('expired');

    if (isAuthError) {
      debugLog('Auth', 'RPC failed due to invalid session, triggering session expiry');
      // Don't cache-fallback for auth errors -- the session is genuinely invalid
      return null; // But also need to signal this is an auth error, not a generic error
    }
    // ... existing cache fallback for non-auth errors
  }
  ```

  BUT returning null still shows the generic error. We need a way to signal "auth error" vs
  "generic error" to the UI layer. Options:

  **Option A1: Add a sessionExpired setter accessible from fetchOnboardingStatus**
  Have fetchOnboardingStatus call setSessionExpired(true) and setSession(null) directly when
  it detects an auth RPC error. This immediately shows the session expired UI without waiting
  for the auto-refresh tick.

  **Option B: Use getUser() instead of getSession() for initialization**
  Replace supabase.auth.getSession() with supabase.auth.getUser() in the initialization effect.
  getUser() makes a network request to verify the JWT server-side (see GoTrueClient line 1249).
  If the session is invalid, it returns an error and we can set isAuthReady=true with session=null.
  Downside: adds a network request on every app load; fails offline.

  **Option C: Guard fetchOnboardingStatus behind a getUser() check**
  Before calling fetchOnboardingStatus in the INITIAL_SESSION handler, call supabase.auth.getUser()
  to validate the session server-side. If getUser fails with auth error, skip the RPC and trigger
  session expiry. If it succeeds, proceed normally.
  Downside: adds latency (extra round-trip before onboarding check).

  **Option D: Wait for the auto-refresh tick before declaring auth ready**
  Delay setting isAuthReady=true until after the first auto-refresh tick completes.
  Downside: adds 0-30 seconds of loading on every app start.

  RECOMMENDATION: Option A1 is the best balance. It requires minimal code changes (only in
  AuthProvider.tsx), handles the specific failure mode, and doesn't add latency for the
  happy path. The fix detects auth-related RPC errors in fetchOnboardingStatus and immediately
  triggers the session expiry flow instead of falling back to cache or returning null.

verification: |
  Test plan:
  1. Sign in normally, verify app works
  2. Delete the user's auth.sessions row from Supabase
  3. Reload the app
  4. EXPECTED: Session expired UI should show immediately (not "Something went wrong")
  5. Click "Sign In" button -> should navigate to /auth/phone
  6. Also test with cached onboarding data in localStorage to verify cache fallback is skipped for auth errors
  7. Also test offline scenario: ensure network errors still show retry UI (not session expired)

files_changed: []
