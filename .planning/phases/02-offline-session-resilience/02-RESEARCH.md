# Phase 2: Offline Session Resilience - Research

**Researched:** 2026-02-10
**Domain:** Supabase Auth offline session persistence, PowerSync connector auth, PWA connectivity detection
**Confidence:** HIGH

## Summary

Phase 2 addresses three distinct offline-session scenarios: (1) a previously-authenticated user opening the app with no connectivity should see cached data, (2) a user whose account has been revoked should see a clear message when token refresh fails upon reconnection, and (3) a user attempting to register while offline should see a "no internet" message instead of cryptic errors.

The good news is that the current `@supabase/auth-js@2.93.3` already includes the fix from PR #710 (merged Aug 2023) that prevents `_recoverAndRefresh` from destroying sessions on retryable network errors -- network failures throw `AuthRetryableFetchError`, and the code explicitly checks `!isAuthRetryableFetchError(error)` before calling `_removeSession()`. This means the session token **should** persist in localStorage across offline app restarts with the current version. The remaining work is: (a) verifying this behavior works end-to-end in the app's flow (particularly around `fetchOnboardingStatus` failing offline), (b) adding proper token-refresh failure detection in the connector and auth provider to distinguish "account revoked" from "network error", and (c) adding a pre-submit connectivity check on the registration pages.

**Primary recommendation:** The majority of this phase is wiring and UI work. No new libraries are needed. The existing `useOnlineStatus` hook, `OfflineMessage` component, and `AuthRetryableFetchError` from auth-js provide the building blocks. Focus on: making the auth flow resilient to `fetchOnboardingStatus` failures when offline, distinguishing permanent auth errors (revoked tokens) from transient ones (network) in the PowerSync connector, and guarding registration forms with connectivity checks.

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.93.3 | Auth, session persistence, token refresh | Already handles offline with `AuthRetryableFetchError` |
| `@supabase/auth-js` | 2.93.3 (transitive) | Core auth engine with `persistSession: true`, `autoRefreshToken: true` | Default config already correct |
| `@powersync/web` | ^1.32.0 | Offline-first data sync, local SQLite | `fetchCredentials` called periodically |
| `@powersync/react` | ^1.8.2 | React hooks for PowerSync (`useStatus`) | `useStatus()` exposes sync status |
| `vite-plugin-pwa` | ^1.2.0 | Service worker, asset caching | Already caches app shell + map tiles |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-error-boundary` | ^6.1.0 | Error boundaries for graceful failures | Wrap auth-dependent components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `navigator.onLine` | Fetch-based ping check | `navigator.onLine` is fast and already used; fetch-ping is more reliable but adds latency. For this phase, `navigator.onLine` is sufficient -- we only need it to gate registration UX, not for critical auth decisions |
| Custom token storage | Supabase's built-in localStorage | Supabase already persists to localStorage with key `sb-{ref}-auth-token`. No benefit to overriding |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Changes to Existing Structure
```
src/
  lib/
    AuthProvider.tsx        # Modify: handle offline onboarding status, token refresh errors
    powersync-connector.ts  # Modify: distinguish permanent vs retryable auth errors in fetchCredentials
  components/
    RequireAuth.tsx          # Modify: trust cached session when offline, handle revoked state
    RequireOnboarded.tsx     # Modify: trust cached onboarding status when offline
    OfflineMessage.tsx       # Already exists, used for offline registration
    SessionExpiredBanner.tsx  # NEW: shown when token refresh fails permanently
  hooks/
    useOnlineStatus.ts      # Already exists, no changes needed
  pages/
    auth/
      PhonePage.tsx          # Modify: pre-submit connectivity check
      VerifyPage.tsx         # Modify: pre-submit connectivity check
```

### Pattern 1: Offline-Aware Auth Initialization
**What:** When the app starts offline, `supabase.auth.getSession()` returns the cached session from localStorage. The access token JWT may be expired, but the session object (including refresh token) is preserved. The app should trust this cached session and show the dashboard with PowerSync's local data.
**When to use:** On every app startup path through `AuthProvider`.
**Key insight:** Supabase auth-js v2.93.3 already preserves the session on network errors. The problem is that `fetchOnboardingStatus()` (an RPC call) fails when offline, returning `null`. The `RequireOnboarded` component then shows a retry UI instead of letting the user through. We need to cache the onboarding status locally.

```typescript
// Pattern: Cache onboarding status in localStorage
const ONBOARDING_CACHE_KEY = 'ag-onboarding-status';

async function fetchOnboardingStatusWithCache(): Promise<OnboardingStatus | null> {
  try {
    const { data, error } = await supabase.rpc('get_onboarding_status');
    if (error) throw error;

    const status: OnboardingStatus = {
      hasProfile: data?.has_profile ?? false,
      hasFarmMembership: data?.has_farm_membership ?? false,
      farmId: data?.farm_id ?? null,
      farmName: data?.farm_name ?? null,
    };

    // Cache on success
    localStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(status));
    return status;
  } catch {
    // On failure (offline), try cached value
    const cached = localStorage.getItem(ONBOARDING_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as OnboardingStatus;
    }
    return null;
  }
}
```

### Pattern 2: Permanent vs Retryable Error Detection in Connector
**What:** The PowerSync connector's `fetchCredentials` must distinguish between "user is not authenticated" (permanent -- force re-login) and "network is down" (retryable -- PowerSync will retry). Currently it calls `refreshSession()` which can fail for both reasons.
**When to use:** In `SupabaseConnector.fetchCredentials()`.

```typescript
// Source: Supabase auth-js source code analysis
// AuthRetryableFetchError = network/5xx errors (retryable)
// AuthApiError with status 400/401/403 = token revoked/invalid (permanent)
import { AuthRetryableFetchError } from '@supabase/supabase-js';

async fetchCredentials() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Try refresh
    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();

    if (error) {
      if (error instanceof AuthRetryableFetchError) {
        // Network error -- throw to tell PowerSync to retry later
        throw error;
      }
      // Permanent error (revoked token, invalid refresh token)
      // Return null to signal "not authenticated"
      return null;
    }

    if (!refreshed) return null;

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: refreshed.access_token,
    };
  }

  return {
    endpoint: import.meta.env.VITE_POWERSYNC_URL,
    token: session.access_token,
  };
}
```

### Pattern 3: Token Refresh Failure Detection via Auth Events
**What:** When Supabase's auto-refresh succeeds, it fires `TOKEN_REFRESHED`. When a refresh permanently fails (revoked account), it fires `SIGNED_OUT`. We should listen for `SIGNED_OUT` events that happen unexpectedly (user did NOT click sign out) and show a "session expired" message.
**When to use:** In `AuthProvider` auth state change handler.

```typescript
// In handleAuthStateChange, distinguish voluntary sign-out from forced sign-out
case 'SIGNED_OUT': {
  setSession(null);
  setUser(null);
  setOnboardingStatus(null);

  // If user didn't explicitly sign out, this was a forced logout (revoked token)
  if (!userInitiatedSignOut.current) {
    setSessionExpiredReason('Your session has expired. Please sign in again.');
  }
  break;
}
```

### Anti-Patterns to Avoid
- **Checking `navigator.onLine` to decide whether to trust cached sessions:** The auth-js library already handles this internally. Don't add your own online check around `getSession()` -- just let auth-js return the cached session.
- **Calling `supabase.auth.refreshSession()` proactively when offline:** This wastes a network call that will fail. Auth-js's `autoRefreshToken` handles this automatically on visibility change.
- **Clearing onboarding status cache on every auth state change:** Only clear it on explicit sign-out. Preserve it during `TOKEN_REFRESHED` events.
- **Using `Promise.race` with timeout for token refresh in the connector:** The connector's `fetchCredentials` is called by PowerSync on its own schedule with its own retry logic. Just throw for retryable errors and return null for permanent ones.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence across restarts | Custom localStorage session management | Supabase `persistSession: true` (default) | auth-js already stores session in localStorage with key `sb-{ref}-auth-token` |
| Token refresh after offline period | Manual refresh timer/logic | Supabase `autoRefreshToken: true` (default) | auth-js handles visibility change events, exponential backoff, and retryable error detection |
| Offline data availability | Custom caching layer | PowerSync local SQLite | PowerSync's entire purpose is offline-first data -- it caches the full sync'd dataset locally |
| Network error classification | Custom error type checking | `AuthRetryableFetchError` from `@supabase/auth-js` | auth-js already classifies network/5xx as retryable and 4xx as permanent |

**Key insight:** The Supabase auth-js library (v2.93.3) already handles most of the "offline session trust" problem correctly since PR #710. The real work is in the surrounding application code: caching onboarding status, handling forced sign-outs gracefully, and guarding registration flows.

## Common Pitfalls

### Pitfall 1: fetchOnboardingStatus Failure Blocking Offline Access
**What goes wrong:** When the app opens offline, `fetchOnboardingStatus()` (a Supabase RPC call) fails. The `AuthProvider` sets `onboardingStatus` to `null`. `RequireOnboarded` interprets null + session as "RPC failed" and shows a retry UI, preventing the user from seeing their cached dashboard data.
**Why it happens:** The RPC call requires network access, but the auth session is correctly cached locally.
**How to avoid:** Cache onboarding status in localStorage on successful fetch. On failure, fall back to the cached value. Clear cache only on explicit sign-out.
**Warning signs:** User opens app offline, sees "Something went wrong" instead of dashboard with cached wells.

### Pitfall 2: Refresh Token Reuse Detection Causing Spurious Logouts
**What goes wrong:** Supabase has "refresh token reuse detection" -- if a refresh token is used more than once outside the 10-second reuse window, the session is terminated. In offline scenarios, a refresh token might be "used" but the response never arrives, then it's used again when coming back online.
**Why it happens:** Network unreliability means the client may not receive the response from a token refresh, leaving it with a "used" token.
**How to avoid:** Supabase already handles this with the "parent token" exception -- if the parent of the current active refresh token is reused, the active token is returned instead of terminating. No custom code needed, but be aware that setting `REFRESH_TOKEN_REUSE_INTERVAL` too low could cause issues.
**Warning signs:** User comes back online and gets unexpectedly logged out. Auth debug logs show "Invalid Refresh Token: Already Used" errors.

### Pitfall 3: navigator.onLine Returning True While Actually Offline
**What goes wrong:** `navigator.onLine` returns `true` when connected to a network (WiFi/cellular) even if there's no actual internet access (e.g., in a rural area with cell signal but no data).
**Why it happens:** The browser API checks network interface status, not internet reachability.
**How to avoid:** For registration gating, use `navigator.onLine` as a fast first check, but handle the actual OTP send failure gracefully as well. Don't rely solely on `navigator.onLine` for critical decisions.
**Warning signs:** User on a WiFi network without internet tries to register, sees the form (not the offline message), then gets a confusing error.

### Pitfall 4: PowerSync Connector Throwing vs Returning Null
**What goes wrong:** The PowerSync connector's `fetchCredentials` should throw for retryable errors (so PowerSync retries) and return null for "not authenticated" (so PowerSync disconnects). If you throw for permanent auth errors, PowerSync will keep retrying forever. If you return null for network errors, PowerSync will stop trying to connect.
**Why it happens:** The connector interface has specific semantics: `throw` = temporary problem, `null` = not signed in.
**How to avoid:** Explicitly check `isAuthRetryableFetchError(error)` and branch accordingly.
**Warning signs:** After revoking a user's account, the connector enters an infinite retry loop instead of disconnecting.

### Pitfall 5: Race Condition Between Auth Init and PowerSync Init
**What goes wrong:** PowerSync is initialized in `AppLayout` (inside `RequireAuth`), but its connector calls `supabase.auth.getSession()` independently. If PowerSync's `fetchCredentials` runs before Supabase auth has finished recovering the session from storage, it gets null and thinks the user is not authenticated.
**Why it happens:** Both systems initialize asynchronously. PowerSync's `connect()` triggers `fetchCredentials` immediately.
**How to avoid:** The current architecture already handles this -- `RequireAuth` waits for `isAuthReady`, and `PowerSyncProvider` is nested inside it. The session is already loaded by the time `fetchCredentials` runs. Don't change this ordering.
**Warning signs:** PowerSync fails to connect on initial load, works on subsequent page navigations.

## Code Examples

Verified patterns from official sources and codebase analysis:

### Detecting Retryable vs Permanent Auth Errors
```typescript
// Source: @supabase/auth-js v2.93.3 source code (node_modules/@supabase/auth-js/src/lib/errors.ts)
// AuthRetryableFetchError is thrown for:
// - fetch() failures (network error, status 0)
// - HTTP 502, 503, 504 responses

import { isAuthRetryableFetchError } from '@supabase/supabase-js';

// In your error handler:
if (isAuthRetryableFetchError(error)) {
  // Network issue -- safe to retry, don't log user out
  throw error; // Let PowerSync retry
} else {
  // Permanent error -- token revoked, account deleted, etc.
  return null; // Signal "not authenticated"
}
```

### Caching Onboarding Status for Offline Use
```typescript
// Pattern for AuthProvider to cache onboarding status
const ONBOARDING_CACHE_KEY = 'ag-onboarding-status';

const fetchOnboardingStatus = useCallback(async (): Promise<OnboardingStatus | null> => {
  try {
    const { data, error } = await supabase.rpc('get_onboarding_status');
    if (error) throw error;

    const status: OnboardingStatus = {
      hasProfile: data?.has_profile ?? false,
      hasFarmMembership: data?.has_farm_membership ?? false,
      farmId: data?.farm_id ?? null,
      farmName: data?.farm_name ?? null,
    };

    // Persist to localStorage for offline access
    try {
      localStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(status));
    } catch {
      // localStorage full or unavailable -- non-critical
    }

    return status;
  } catch {
    // Network error -- try cache
    try {
      const cached = localStorage.getItem(ONBOARDING_CACHE_KEY);
      if (cached) return JSON.parse(cached) as OnboardingStatus;
    } catch {
      // Invalid cache -- ignore
    }
    return null;
  }
}, []);
```

### Connectivity Guard for Registration Forms
```typescript
// Source: existing useOnlineStatus hook + OfflineMessage component
// Pattern for PhonePage.tsx / VerifyPage.tsx

const isOnline = useOnlineStatus();

const handleSubmit = useCallback(async (e: FormEvent) => {
  e.preventDefault();

  // Pre-submit connectivity check
  if (!isOnline) {
    setError('No internet connection. Connect to the internet to sign in.');
    return;
  }

  try {
    setLoading(true);
    await sendOtp(`+1${cleanPhone}`);
    navigate('/auth/verify', { state: { phone: `+1${cleanPhone}` } });
  } catch (err) {
    // Also catch network errors from the actual call
    const message = err instanceof Error ? err.message : 'Failed to send verification code';
    setError(message);
  } finally {
    setLoading(false);
  }
}, [phone, sendOtp, navigate, isOnline]);
```

### Supabase Auth Event Handling for Forced Logout Detection
```typescript
// Pattern: Track whether sign-out was user-initiated
const userInitiatedSignOut = useRef(false);

const signOut = useCallback(async (): Promise<void> => {
  userInitiatedSignOut.current = true;
  try {
    await supabase.auth.signOut();
  } catch (error) {
    debugError('Auth', 'Sign out error:', error);
  }
  // ... cleanup
  userInitiatedSignOut.current = false;
}, []);

// In auth state change handler:
case 'SIGNED_OUT': {
  if (!userInitiatedSignOut.current) {
    // This was a forced sign-out (revoked account, expired session)
    // Set state to trigger "session expired" message
    setSessionExpired(true);
  }
  setSession(null);
  setUser(null);
  setOnboardingStatus(null);
  break;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| auth-js destroyed session on any refresh error | auth-js preserves session on `AuthRetryableFetchError` | Aug 2023 (PR #710) | Session survives offline restarts in auth-js >=2.33.x |
| `getSession()` auto-refreshed expired tokens | `getSession()` reads from localStorage only, no network call | Supabase docs clarification | `getSession()` is safe to call offline |
| PowerSync required custom offline-detection | PowerSync's `fetchCredentials` handles errors with retry | Ongoing improvements | Throw for retryable, return null for permanent |

**Deprecated/outdated:**
- `supabase.auth.session()` (v1 API): Replaced by `supabase.auth.getSession()` in v2
- `gotrue-js`: Renamed to `auth-js`, then merged into `supabase-js` monorepo (Jan 2026)

## Analysis of Current Codebase Gaps

### Gap 1: Onboarding Status Not Cached
**File:** `src/lib/AuthProvider.tsx` (lines 64-87)
**Issue:** `fetchOnboardingStatus()` calls `supabase.rpc('get_onboarding_status')` with no fallback. When offline, this fails and sets `onboardingStatus` to `null`. `RequireOnboarded` (line 39) then shows "Something went wrong" retry UI.
**Fix:** Add localStorage caching with offline fallback.
**Confidence:** HIGH -- verified by reading both files.

### Gap 2: Connector Doesn't Distinguish Error Types
**File:** `src/lib/powersync-connector.ts` (lines 35-56)
**Issue:** `fetchCredentials()` calls `getSession()`, then `refreshSession()`. If `refreshSession()` fails due to a revoked token, it throws `new Error('Not authenticated')`. PowerSync treats all thrown errors as retryable and keeps retrying. If it's a permanent auth failure (revoked account), this creates an infinite retry loop.
**Fix:** Check for `AuthRetryableFetchError` -- throw for retryable, return null for permanent.
**Confidence:** HIGH -- verified from PowerSync docs and auth-js source.

### Gap 3: No "Session Expired" UI for Revoked Accounts
**File:** `src/lib/AuthProvider.tsx`, `src/components/RequireAuth.tsx`
**Issue:** When a user's account is revoked and the token refresh fails permanently, the auth state changes to `SIGNED_OUT`. The user is silently redirected to `/auth/phone` with no explanation. Success criterion #2 requires a clear "Your session has expired, please sign in again" message.
**Fix:** Track user-initiated vs forced sign-out. Show a session-expired message on forced sign-out.
**Confidence:** HIGH -- verified by reading auth state change handler.

### Gap 4: Registration Pages Lack Offline Guard
**File:** `src/pages/auth/PhonePage.tsx`, `src/pages/auth/VerifyPage.tsx`
**Issue:** The `RequireAuth` component already shows `OfflineMessage` when offline and not authenticated. But if the user navigates directly to `/auth/phone` while offline (or goes offline after opening the page), there's no pre-submit check. The OTP send will fail with a network error that shows as a generic "Failed to send verification code" message.
**Fix:** Add `useOnlineStatus()` check before form submission. Show "No internet connection -- connect to sign in" instead.
**Confidence:** HIGH -- verified by reading PhonePage and VerifyPage source.

### Gap 5: Onboarding Status Cache Not Cleared on Sign-Out
**File:** `src/lib/AuthProvider.tsx` (lines 256-276)
**Issue:** The `signOut` function clears session, user, and PowerSync data, but needs to also clear the onboarding status cache from localStorage when it's added.
**Fix:** Clear the localStorage cache key in `signOut()`.
**Confidence:** HIGH -- straightforward addition.

## Open Questions

1. **Does the current Supabase JWT expiry allow offline sessions to survive realistic durations?**
   - What we know: Default JWT expiry is 1 hour (Supabase docs). The `autoRefreshToken` mechanism refreshes before expiry.
   - What's unclear: If a user is offline for more than 1 hour, the JWT expires but the refresh token in localStorage is still valid. When they come back online, auth-js should use the refresh token. But we haven't tested this end-to-end.
   - Recommendation: This should work correctly based on auth-js source code analysis. Verify during implementation with a manual test: log in, go offline, wait >1h, come back online.

2. **Does PowerSync's sync reconnect automatically after the connector returns null?**
   - What we know: PowerSync docs say `fetchCredentials` returning null means "not authenticated". The SDK should stop trying to connect.
   - What's unclear: Does PowerSync fire any events we can listen to for detecting "forced disconnect due to auth failure"? Can we use this to trigger the "session expired" UI?
   - Recommendation: Use the `AuthProvider`'s `SIGNED_OUT` event detection rather than depending on PowerSync for this signal. Keep the auth and sync concerns separate.

3. **Should we cache onboarding status in localStorage or in PowerSync's local SQLite?**
   - What we know: PowerSync's SQLite DB already has the user's data cached. But onboarding status comes from an RPC function, not from a synced table.
   - What's unclear: Whether it's cleaner to query the local PowerSync DB for the user/farm data vs. caching the RPC result.
   - Recommendation: Use localStorage for onboarding status cache. It's simpler, doesn't require PowerSync to be initialized (PowerSync is inside AppLayout, but onboarding check is in RequireOnboarded which wraps AppLayout), and keeps the auth flow independent of the sync layer.

## Sources

### Primary (HIGH confidence)
- `@supabase/auth-js` v2.93.3 source code in node_modules -- `GoTrueClient.ts` lines 2565-2646 (`_recoverAndRefresh`), lines 2636-2644 (retryable error check), `lib/fetch.ts` lines 38-47 (error classification)
- PowerSync `PowerSyncBackendConnector` interface -- [GitHub source](https://github.com/powersync-ja/powersync-js/blob/main/packages/common/src/client/connection/PowerSyncBackendConnector.ts): `fetchCredentials` returns null (not signed in) or throws (retryable)
- [Supabase Sessions documentation](https://supabase.com/docs/guides/auth/sessions) -- Session lifecycle, refresh token reuse detection, JWT expiry recommendations
- Context7 `/supabase/supabase-js` -- `createClient` auth options (`persistSession: true`, `autoRefreshToken: true`), `onAuthStateChange` events (`TOKEN_REFRESHED`, `SIGNED_OUT`)
- Context7 `/powersync-ja/powersync-docs` -- Backend connector patterns, `fetchCredentials` semantics

### Secondary (MEDIUM confidence)
- [supabase/auth-js#141](https://github.com/supabase/auth-js/issues/141) -- "Network error removes session data" -- **closed** Aug 2023 via PR #710
- [supabase/auth-js#710](https://github.com/supabase/auth-js/pull/710) -- `_recoverAndRefresh` does not remove session on retryable error
- [Supabase Discussion #36906](https://github.com/orgs/supabase/discussions/36906) -- React Native offline session loss (July 2025) -- may indicate edge case with `startAutoRefresh()` on React Native, less relevant for web PWA
- [MDN navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) -- Limitations of `navigator.onLine` API

### Tertiary (LOW confidence)
- [AnswerOverflow discussion](https://www.answeroverflow.com/m/1402284237478166549) -- Community reports of offline auth issues (could not access due to rate limiting)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed, auth-js source code verified
- Architecture: HIGH -- Gaps identified by reading actual codebase files, patterns derived from official docs
- Pitfalls: HIGH -- Based on auth-js source code analysis and documented community issues
- Code examples: HIGH -- Based on existing codebase patterns and auth-js source code

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain -- auth patterns change slowly)
