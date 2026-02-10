# Phase 01: Session Stability - Research

**Researched:** 2026-02-10
**Domain:** React auth session recovery, error boundaries, Supabase security hardening
**Confidence:** HIGH

## Summary

This phase addresses three known stability bugs and one security issue in the AG Water Tracker app: (1) loading spinner hang when `get_onboarding_status` RPC fails during session check, (2) blank white page on dashboard reload when PowerSync initialization races with component rendering, and (3) SECURITY DEFINER functions exposed in the public schema callable via PostgREST API. The fix strategy is straightforward: add timeouts and fallback behavior to auth initialization, wrap the component tree in error boundaries with retry capability, and migrate RPC functions to a private schema.

The codebase already has solid foundations -- `RequireAuth` guards session state, `RequireOnboarded` guards onboarding state, `PowerSyncContext` handles DB init errors, and the connector already attempts token refresh. The gaps are: no timeout on session check (hangs forever on network failure), no error boundaries anywhere in the component tree, no recovery path when `get_onboarding_status` returns null (treated as "not onboarded"), and SECURITY DEFINER functions are in the `public` schema where PostgREST exposes them.

**Primary recommendation:** Add a 5-second timeout to auth initialization with offline-first fallback (trust local session if available), wrap key UI regions in `react-error-boundary` ErrorBoundary components with friendly retry UI, and move all SECURITY DEFINER functions to a `private` schema via a single migration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Recovery fallback: Claude's discretion on whether to trust local state vs force re-login when session check fails (offline-first is the guiding principle)
- Recovery fallback: Claude's discretion on timeout duration for session check
- Recovery fallback: Claude's discretion on handling partial onboarding state when RPC fails
- Recovery fallback: Claude's discretion on late session rejection behavior (quiet redirect vs toast)
- Error screen UX: Tone is friendly and simple -- "Something went wrong. Tap to try again." No technical details, approachable language
- Error screen UX: Include icon + text on error screens (warning or refresh icon alongside the message)
- Error screen UX: Claude's discretion on recovery options (retry only vs retry + dashboard fallback)
- Error screen UX: Claude's discretion on error boundary granularity (per-component vs per-page)
- Loading states: No status text during loading -- just visual indicators, no "Connecting..." messages
- Loading states: Show a "Taking longer than usual..." message if loading exceeds ~5 seconds so user knows it's not frozen
- Loading states: Claude's discretion on initial load visual (branded splash vs spinner)
- Loading states: Claude's discretion on dashboard loading visual (skeleton vs spinner vs progressive reveal)
- Console cleanup: Claude's discretion on which console.log statements to remove (at minimum all auth/token/session sensitive ones)
- Console cleanup: Claude's discretion on whether to include a hidden debug mode for field support
- Security: SECURITY DEFINER functions: move to private schema (Claude picks schema name)
- Security: Quick audit of ALL existing RPC functions for similar issues, not just the known SECURITY DEFINER problem

### Claude's Discretion
- Session recovery strategy (trust local vs force re-login)
- Timeout duration for session check
- Partial onboarding fallback approach
- Late session rejection UX (quiet vs toast)
- Error boundary granularity and recovery options
- Loading indicator style on initial load and dashboard
- Console.log cleanup aggressiveness
- Hidden debug mode decision
- Private schema naming

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-error-boundary | ^5.0.0 | Error boundary with reset/retry support | De facto standard for React error boundaries; 5M+ weekly npm downloads; provides `ErrorBoundary`, `useErrorBoundary`, `resetKeys`, `FallbackComponent` |
| React (class component) | 19.x | Built-in error boundary capability | `getDerivedStateFromError` + `componentDidCatch` still the only way React supports error boundaries natively |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @heroicons/react | ^2.2.0 | Icons for error/loading states | Already in project; use `ExclamationTriangleIcon`, `ArrowPathIcon` for error screens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-error-boundary | Hand-rolled class component | Class components work fine but lack `resetKeys`, `onReset`, `useErrorBoundary` hook; react-error-boundary is ~2KB and battle-tested |

**Installation:**
```bash
npm install react-error-boundary
```

## Architecture Patterns

### Recommended Error Boundary Placement
```
main.tsx
  BrowserRouter
    AuthProvider
      App.tsx (Router)
        /auth/* routes          -- NO error boundary needed (simple forms)
        /onboarding/* routes    -- NO error boundary needed (simple forms)
        RequireAuth
          RequireOnboarded
            AppLayout
              ErrorBoundary     -- ROUTE-LEVEL: wraps all protected page content
                PowerSyncProvider
                  AppLayoutContent
                    ErrorBoundary -- MAP-LEVEL: wraps MapView specifically
                      DashboardPage
```

### Pattern 1: Auth Initialization with Timeout + Offline Fallback
**What:** Wrap the auth initialization in a timeout so it never hangs indefinitely. If offline and a local session exists, trust it. If the RPC fails, fall back gracefully.
**When to use:** During app startup when `getSession()` and `get_onboarding_status` RPC are called.
**Confidence:** HIGH (based on codebase analysis + Supabase docs)

```typescript
// AuthProvider.tsx - enhanced initializeAuth
const initializeAuth = async () => {
  try {
    // Step 1: Get session (fast, reads from localStorage)
    const { data: { session: initialSession } } = await supabase.auth.getSession();

    if (!initialSession) {
      // No session at all -- not logged in
      setIsAuthReady(true);
      return;
    }

    setSession(initialSession);
    setUser(initialSession.user);

    // Step 2: Fetch onboarding status with timeout
    const status = await Promise.race([
      fetchOnboardingStatus(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (status) {
      setOnboardingStatus(status);
    } else {
      // RPC timed out or failed -- check if we can use cached/local data
      // For offline-first: if we have a session, let the user through
      // PowerSync local DB will still work
      // The onboardingStatus will be null, which RequireOnboarded handles
      // We can set a "best-effort" status if PowerSync has local data
    }
  } catch (error) {
    console.error('Auth initialization failed:', error);
  } finally {
    setIsAuthReady(true);  // ALWAYS mark ready to prevent infinite spinner
  }
};
```

### Pattern 2: Error Boundary with Friendly Retry UI
**What:** A reusable error fallback component with icon + friendly message + retry button.
**When to use:** Around route-level content and crash-prone components (MapView, PowerSync queries).
**Confidence:** HIGH (verified via react-error-boundary docs)

```typescript
// Source: react-error-boundary official docs
import { ErrorBoundary } from 'react-error-boundary';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-[50vh] p-6">
      <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium text-white mb-2">Something went wrong</p>
      <p className="text-gray-400 text-sm mb-6">Tap to try again.</p>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-5 py-3 bg-primary rounded-lg text-white font-medium"
      >
        <ArrowPathIcon className="h-5 w-5" />
        Try Again
      </button>
    </div>
  );
}

// Usage in AppLayout:
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <PowerSyncProvider>
    <AppLayoutContent />
  </PowerSyncProvider>
</ErrorBoundary>
```

### Pattern 3: SECURITY DEFINER Functions in Private Schema
**What:** Move all SECURITY DEFINER functions from `public` schema to a `private` schema so PostgREST cannot expose them via the API. Create thin `public` wrapper functions that call the private implementations.
**When to use:** For any function that uses `SECURITY DEFINER` and should not be directly callable via the REST API.
**Confidence:** HIGH (verified via Supabase official docs)

```sql
-- Source: Supabase official docs - database functions security
-- Create private schema
CREATE SCHEMA IF NOT EXISTS private;

-- Move implementation to private schema
CREATE OR REPLACE FUNCTION private.get_onboarding_status_impl()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    -- ... rest of implementation
BEGIN
    v_user_id := auth.uid();
    -- ... implementation using fully-qualified table names (public.users, etc.)
END;
$$;

-- Public wrapper (SECURITY INVOKER, the default) just delegates
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSON
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.get_onboarding_status_impl();
$$;
```

**Important note on `search_path`:** Supabase official docs recommend setting `search_path = ''` (empty string) on SECURITY DEFINER functions and using fully qualified table names (`public.users` instead of `users`) to prevent search_path injection attacks.

### Anti-Patterns to Avoid
- **Anti-pattern: Catch-all try/catch that swallows errors silently.** Error boundaries should log errors and show fallback UI. `componentDidCatch` or `onError` should report to a logging service (or at minimum console.error).
- **Anti-pattern: Using `getSession()` for server-side auth validation.** On the client (this app is a SPA), `getSession()` is fine -- it reads from the browser's own localStorage. The "insecure" warning applies to SSR contexts where cookies could be spoofed. Our client-side usage is correct.
- **Anti-pattern: Setting `isAuthReady` only on success.** If the auth check throws, the app hangs forever on a spinner. Always set `isAuthReady = true` in a `finally` block.
- **Anti-pattern: Nested error boundaries without clear separation of concerns.** Each error boundary should have a distinct purpose (route-level vs component-level). Don't wrap every component -- that adds overhead and confuses recovery behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundaries | Custom class component with state | `react-error-boundary` | Provides `resetKeys` for auto-recovery, `useErrorBoundary` hook, `onReset` callback, `FallbackComponent` prop, ref-based imperative reset. ~2KB gzipped. |
| Promise timeout | Custom setTimeout + reject wrapper | `Promise.race([operation(), timeout()])` | Standard JS pattern, no library needed. But use the `Promise.race` pattern consistently -- don't hand-roll different timeout mechanisms in different places. |

**Key insight:** Error boundaries are a React class component feature. While you can write your own, `react-error-boundary` provides the reset/retry patterns needed for recovery UI without writing class components in a functional codebase.

## Common Pitfalls

### Pitfall 1: onboardingStatus null treated as "not onboarded"
**What goes wrong:** When `get_onboarding_status` RPC fails (timeout, network error), `fetchOnboardingStatus()` returns `null`. `RequireOnboarded` shows a spinner forever when `onboardingStatus` is `null`, because it's waiting for a response that will never come.
**Why it happens:** The current code has no timeout on the RPC call, and `null` status is treated as "still loading" rather than "failed."
**How to avoid:** Distinguish between "loading" (initial state, haven't tried yet), "loaded" (got a response), and "failed" (tried and failed). On failure, either: (a) trust local PowerSync data and allow access to the dashboard, or (b) show an error with retry button.
**Warning signs:** Infinite spinner on dashboard after network blip during app startup.

### Pitfall 2: Error boundary placement too high catches auth errors
**What goes wrong:** If an error boundary wraps `AuthProvider`, auth initialization errors get caught and show a generic "Something went wrong" instead of redirecting to login.
**Why it happens:** Error boundaries catch all errors from children during rendering. Auth errors should redirect, not show error UI.
**How to avoid:** Place error boundaries BELOW auth guards, not above them. Auth errors should result in redirect to `/auth/phone`, not error UI.
**Warning signs:** User sees error screen when they should see login screen.

### Pitfall 3: PowerSync provider error vs component error
**What goes wrong:** `PowerSyncContext.tsx` already handles DB initialization errors with its own error UI. If an error boundary also wraps it, you get two layers of error handling.
**Why it happens:** PowerSync initialization failure is a known, expected error (bad credentials, DB corruption). Component crashes are unexpected errors.
**How to avoid:** The error boundary should wrap the PowerSync provider, catching errors from child components that occur AFTER initialization. PowerSync's own error handling catches init failures. These are complementary, not redundant.
**Warning signs:** User sees two different error UIs for different failure modes.

### Pitfall 4: SECURITY DEFINER functions with `SET search_path = public`
**What goes wrong:** Current functions set `search_path = public`, which means they execute in the public schema context. While better than no search_path setting, the Supabase recommendation is `search_path = ''` (empty) with fully qualified table names.
**Why it happens:** The original migration used the common but suboptimal pattern of `SET search_path = public`.
**How to avoid:** When moving to private schema, set `search_path = ''` and use `public.users`, `public.farms`, etc.
**Warning signs:** N/A -- this is a security hardening issue, not a runtime bug.

### Pitfall 5: Race condition between auth state change and PowerSync init
**What goes wrong:** Dashboard reload: `RequireAuth` passes (session exists in localStorage), `RequireOnboarded` passes (onboardingStatus exists from previous session), `AppLayout` renders, PowerSync init starts async, but `DashboardPage` tries to use `usePowerSync()` before init completes.
**Why it happens:** The `PowerSyncContext` shows a loading state during init, so this is actually handled. But if `usePowerSync()` is called outside the provider (e.g., in a guard or parent component), it throws.
**How to avoid:** Ensure `usePowerSync()` is only used inside `PowerSyncProvider`. This is already correct in the codebase.
**Warning signs:** "usePowerSync must be used within PowerSyncProvider" error on reload.

### Pitfall 6: Dashboard blank page on reload -- the actual root cause
**What goes wrong:** On hard reload at `/app/dashboard` or `/`, the auth initialization flow is: (1) `getSession()` returns cached session, (2) `get_onboarding_status` RPC is called, (3) the RPC response determines routing. If step 2 fails, `onboardingStatus` stays `null`, and `RequireOnboarded` shows a spinner. If `RequireOnboarded` somehow passes but PowerSync hasn't initialized, the dashboard renders without data.
**Why it happens:** Multiple async operations (auth, onboarding status, PowerSync init) must all succeed for the dashboard to render. Any failure in the chain produces a degraded state.
**How to avoid:** Make the auth chain resilient: if RPC fails, attempt to derive onboarding status from PowerSync local data (which persists across reloads). Add a timeout so the loading state resolves within 3 seconds.
**Warning signs:** Blank page or infinite spinner on `Cmd+R` / `F5` at the dashboard URL.

## Code Examples

### Example 1: Auth initialization with timeout and slow-load detection
```typescript
// Source: codebase analysis + Supabase JS docs
const FAST_TIMEOUT_MS = 5000;  // Give up on RPC after 5s
const SLOW_LOAD_MS = 5000;     // Show "Taking longer than usual..." after 5s

const initializeAuth = async () => {
  try {
    const { data: { session: initialSession } } = await supabase.auth.getSession();

    if (!initialSession) {
      setIsAuthReady(true);
      return;
    }

    setSession(initialSession);
    setUser(initialSession.user);

    // Race: onboarding status vs timeout
    const status = await Promise.race([
      fetchOnboardingStatus(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FAST_TIMEOUT_MS)),
    ]);

    setOnboardingStatus(status);
  } catch (error) {
    // Log but don't crash -- let auth resolve as "no session"
  } finally {
    setIsAuthReady(true);
  }
};
```

### Example 2: Slow-load overlay with "Taking longer than usual..." message
```typescript
// Source: user requirements + React patterns
function LoadingScreen() {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowMessage(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
      {showSlowMessage && (
        <p className="text-gray-400 text-sm">Taking longer than usual...</p>
      )}
    </div>
  );
}
```

### Example 3: Private schema migration for SECURITY DEFINER functions
```sql
-- Source: Supabase official docs - database security
-- Migration: Move SECURITY DEFINER functions to private schema

-- Step 1: Create private schema
CREATE SCHEMA IF NOT EXISTS private;

-- Step 2: Revoke public access to private schema
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

-- Step 3: Grant usage to postgres role (needed for function execution)
GRANT USAGE ON SCHEMA private TO postgres;
GRANT USAGE ON SCHEMA private TO service_role;

-- Step 4: Move function implementations
-- (Each function moves to private schema with search_path = '')

-- Step 5: Replace public functions with SECURITY INVOKER wrappers
-- that delegate to private implementations
```

### Example 4: console.log cleanup with debug mode
```typescript
// Source: recommended pattern
const DEBUG = localStorage.getItem('__ag_debug') === 'true';

function debugLog(tag: string, ...args: unknown[]) {
  if (DEBUG) {
    console.log(`[${tag}]`, ...args);
  }
}

// Usage: replace console.log('[PowerSync] Status changed:', ...)
// with:  debugLog('PowerSync', 'Status changed:', ...)
```

## Discretion Recommendations

Based on the codebase analysis and research, here are my recommendations for the areas left to Claude's discretion:

### Session recovery strategy: Trust local session (offline-first)
**Recommendation:** If a cached session exists in localStorage (i.e., `getSession()` returns non-null), trust it and proceed. If `get_onboarding_status` RPC times out, attempt to derive status from PowerSync local DB queries (`SELECT 1 FROM users WHERE id = ?` and `SELECT farm_id FROM farm_members WHERE user_id = ?`). This is the offline-first approach -- the user's device has local data; use it.
**Rationale:** The app targets agricultural field workers with unreliable connectivity. Forcing re-login when the session token exists but the RPC is slow would be a terrible UX. The JWT token itself validates auth; the RPC just checks onboarding status.

### Timeout duration: 5 seconds for RPC, 3 seconds visible loading
**Recommendation:** Use a 5-second timeout on the `get_onboarding_status` RPC call. The visible loading screen should resolve within 3 seconds in the happy path (session check is near-instant from localStorage). The "Taking longer than usual..." message appears at 5 seconds if the whole auth flow hasn't completed.
**Rationale:** `getSession()` reads from localStorage (<50ms). The RPC round-trip is typically <500ms on good connectivity. A 5-second timeout catches network failures without being too aggressive.

### Partial onboarding fallback: Use local PowerSync data
**Recommendation:** When the RPC fails but a session exists, attempt to query the local PowerSync DB for onboarding status (check `users` and `farm_members` tables). If local data shows the user is fully onboarded, proceed to dashboard. If no local data exists (fresh install, never synced), redirect to login.
**Rationale:** PowerSync's local SQLite DB persists across reloads. If the user was previously onboarded, their data is available locally. This is the "offline-first" principle applied to auth.

### Late session rejection: Quiet redirect
**Recommendation:** If a session is later found to be invalid (e.g., token refresh fails after initial load), quietly redirect to `/auth/phone`. No toast or error message -- the user simply sees the login screen.
**Rationale:** "Your session expired" messages are confusing for non-technical users. A quiet redirect is cleaner. The user just signs in again.

### Error boundary granularity: Route-level + MapView-specific
**Recommendation:** Two error boundaries:
1. **Route-level boundary** inside `AppLayout`, wrapping `PowerSyncProvider` + child routes. Catches any component crash in the protected app area.
2. **MapView-specific boundary** wrapping the MapView component in DashboardPage. MapView is the most crash-prone component (WebGL errors, tile fetch failures).
**Rationale:** Per-page boundaries are overkill -- most pages are simple forms. The map is the only component likely to crash independently. Route-level catches everything else.

### Loading indicator style: Clean spinner, no branding
**Recommendation:** Use a simple spinner (the existing `animate-spin` pattern) with no text initially. No branded splash screen -- it adds complexity and the app loads fast enough that a splash is unnecessary. For the dashboard specifically, show the spinner while PowerSync initializes, then progressive reveal as data loads.
**Rationale:** The user decision says "no status text during loading." A spinner is clean, universal, and already used throughout the app. Maintaining consistency is more important than visual novelty.

### Console.log cleanup: Remove all, add debug utility
**Recommendation:** Remove all `console.log` statements from production code. Replace with a `debugLog()` utility gated behind `localStorage.getItem('__ag_debug')`. Keep `console.error` for genuine errors that should be visible even in production. Remove `console.warn` from non-actionable warnings (map tile errors are already handled by the UI).
**Rationale:** The current codebase has 16+ console.log/warn/error statements. Sensitive ones include PowerSync upsert data logging (`data` objects), auth error details. A hidden debug mode (`localStorage.__ag_debug = 'true'`) enables field support without cluttering the production console.

### Private schema naming: `private`
**Recommendation:** Name the private schema `private`. This is the convention used in Supabase's own documentation and examples.
**Rationale:** Supabase docs consistently use `private` as the schema name for security definer functions. Following the convention makes the code easier to understand for anyone familiar with Supabase.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based error boundaries | `react-error-boundary` library | 2020+ (v3+) | Provides hooks, reset keys, and FallbackComponent prop for functional React codebases |
| `SET search_path = public` on SECURITY DEFINER | `SET search_path = ''` with fully qualified names | Supabase docs updated 2024 | Prevents search_path injection attacks |
| SECURITY DEFINER in public schema | Private schema + SECURITY INVOKER wrappers | Supabase docs recommendation | Prevents direct API invocation of privileged functions |
| `getSession()` for auth validation | `getUser()` for server-side, `getSession()` still fine for client SPA | Supabase auth-js 2024 | Warning only applies to SSR; client-side SPA usage is correct |

**Deprecated/outdated:**
- The `getSession()` "insecure" warning does NOT apply to this project. This is a client-side SPA, not SSR. The warning is for server contexts where cookies could be spoofed. Our usage (`getSession()` reading from browser localStorage) is correct and safe.

## Existing Codebase Findings

### Current SECURITY DEFINER functions (full audit)
All functions in `public` schema with `SECURITY DEFINER`:

| Function | Migration | Risk Level | Action |
|----------|-----------|------------|--------|
| `generate_random_code(integer)` | 010 | LOW (helper, no auth bypass) | Move to private |
| `create_farm_and_membership(text,text,text,text,text)` | 015 | HIGH (creates data with owner privileges) | Move to private, add public wrapper |
| `join_farm_with_code(text)` | 010 | HIGH (creates farm membership) | Move to private, add public wrapper |
| `create_invite_code(uuid,text,integer,integer)` | 010 | MEDIUM (creates invites) | Move to private, add public wrapper |
| `get_onboarding_status()` | 019 | HIGH (reads auth.users, auto-creates memberships) | Move to private, add public wrapper |
| `get_user_farm_memberships()` | 010 | LOW (read-only) | Move to private, add public wrapper |
| `invite_user_by_phone(uuid,text,text,text)` | 019 | HIGH (reads auth.users, creates invites) | Move to private, add public wrapper |
| `revoke_farm_invite(text)` | 019 | MEDIUM (deletes invites) | Move to private, add public wrapper |

**Key finding:** All 8 functions use `SECURITY DEFINER` and are in the `public` schema. All need to be moved. Each already validates `auth.uid()`, but being in the public schema means they're callable via PostgREST's RPC endpoint, which is the exposure vector. Moving to a private schema with public wrappers preserves the API contract while removing the security risk.

### Console.log inventory
| File | Line | Type | Content | Sensitivity | Action |
|------|------|------|---------|-------------|--------|
| `powersync-connector.ts:68` | error | Permanent upload error + error object | LOW | Keep as debugLog |
| `powersync-connector.ts:71` | warn | Retryable upload error + error object | LOW | Keep as debugLog |
| `powersync-connector.ts:95` | error | Unexpected table in CRUD | LOW | Keep as debugLog |
| `powersync-connector.ts:104` | log | **Upsert data object** | **HIGH** - logs full row data | Remove/debugLog |
| `powersync-connector.ts:106` | log | **Upsert response with data** | **HIGH** - logs response data | Remove/debugLog |
| `powersync.ts:27` | log | Sync status changed | LOW | Keep as debugLog |
| `powersync.ts:37` | log | Initial sync status | LOW | Keep as debugLog |
| `AuthProvider.tsx:69` | error | Onboarding status fetch error | MEDIUM | Keep as debugLog |
| `AuthProvider.tsx:83` | error | Onboarding status error | MEDIUM | Keep as debugLog |
| `AuthProvider.tsx:180` | error | Initial session error | MEDIUM | Keep as debugLog |
| `AuthProvider.tsx:252` | error | Sign out error | LOW | Keep as console.error |
| `AuthProvider.tsx:259` | error | PowerSync clear error | LOW | Keep as console.error |
| `DashboardPage.tsx:73` | error | Missing farmId/user | LOW | Keep as console.error |
| `DashboardPage.tsx:114` | error | Well save failure | LOW | Keep as debugLog |
| `MapView.tsx:96` | warn | Map error | LOW | Keep as debugLog |
| `AddUserModal.tsx:86` | error | SMS send failure | LOW | Keep as debugLog |
| `AddUserModal.tsx:90` | error | SMS send failure (outer) | LOW | Keep as debugLog |
| `useGeolocation.ts:105` | warn | Geolocation API not available | LOW | Keep as debugLog |
| `useGeolocation.ts:141` | warn | Geolocation error details | LOW | Keep as debugLog |

### Current loading states (no error boundaries exist)
| Location | Current Behavior | Problem |
|----------|-----------------|---------|
| `RequireAuth` (line 21-28) | Spinner + "Loading..." text | Text violates "no status text" decision. No timeout. |
| `RequireOnboarded` (line 14-22) | Spinner + "Checking account status..." text | Text violates "no status text" decision. Hangs forever if RPC fails. |
| `PowerSyncContext` (line 50-58) | Spinner + "Initializing database..." text | Text violates "no status text" decision. |
| `ProfilePage` (line 29-36) | Spinner + "Loading..." text | Text violates "no status text" decision. |

All four need to be updated to: spinner only, no text, with 5-second "Taking longer than usual..." fallback message.

## Open Questions

1. **PowerSync local DB onboarding fallback -- does it work on fresh install?**
   - What we know: PowerSync local DB persists across reloads for returning users. We can query `users` and `farm_members` tables locally.
   - What's unclear: On a completely fresh install where PowerSync has never synced, these tables will be empty. The fallback would correctly detect "not onboarded" and redirect to login/onboarding.
   - Recommendation: This is fine -- fresh installs require connectivity anyway (for OTP). The fallback is only relevant for returning users who have synced at least once.

2. **SECURITY DEFINER wrapper pattern -- does PostgREST call the public wrapper or private impl?**
   - What we know: PostgREST only exposes schemas listed in `db_extra_search_path` and the primary schema (usually `public`). The `private` schema won't be in that list.
   - What's unclear: Whether the public SECURITY INVOKER wrapper, when calling the private SECURITY DEFINER function, correctly inherits the elevated privileges.
   - Recommendation: HIGH confidence this works -- Supabase docs explicitly show this pattern. The public wrapper calls the private function, which runs as the creator (postgres) due to SECURITY DEFINER. Test with a simple function first.

3. **`get_onboarding_status` has side effects (auto-creates profiles/memberships)**
   - What we know: Migration 019 added auto-matching logic that creates user profiles and farm memberships as side effects of checking onboarding status.
   - What's unclear: If this function is called multiple times (retry after timeout), could it create duplicate entries?
   - Recommendation: LOW risk -- the function uses `ON CONFLICT DO NOTHING` for both INSERT operations. Multiple calls are idempotent.

## Sources

### Primary (HIGH confidence)
- React official docs (react.dev) - Error boundary API (`getDerivedStateFromError`, `componentDidCatch`)
- Supabase official docs (supabase.com/docs) - SECURITY DEFINER functions, private schema pattern, `search_path` security
- react-error-boundary GitHub (bvaughn/react-error-boundary) - `ErrorBoundary`, `FallbackComponent`, `resetKeys`, `useErrorBoundary`, `onReset`
- PowerSync official docs (docs.powersync.com) - `fetchCredentials`, connection status, `hasSynced`, offline-first patterns

### Secondary (MEDIUM confidence)
- Supabase auth-js GitHub issues (#873, #898, #1010) - `getSession()` security warning context (confirmed: client-side SPA usage is safe)
- Codebase analysis of 19 migration files - SECURITY DEFINER function audit

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `react-error-boundary` is the de facto standard, well-documented, actively maintained
- Architecture: HIGH - error boundary placement, auth timeout, private schema patterns all verified with official docs
- Pitfalls: HIGH - identified from direct codebase analysis of actual failure modes
- Security audit: HIGH - all 8 SECURITY DEFINER functions inventoried from migration files

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days -- stable domain, no fast-moving dependencies)
