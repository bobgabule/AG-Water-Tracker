# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** Phase 7 in progress -- User Management (disable/enable infrastructure done, UI next)

## Current Position

Phase: 7 of 8 (User Management)
Plan: 1 of 2 in phase 07 -- COMPLETE
Status: Executing phase 07
Last activity: 2026-02-11 -- Completed 07-01-PLAN.md (Disable/Enable Infrastructure)

Progress: [████████░░] 75%

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: 5min
- Total execution time: 1.55 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-session-stability | 5 | 21min | 4min |
| 02-offline-session-resilience | 3 | 18min | 6min |
| 03-role-foundation | 4 | 14min | 4min |
| 04-permission-enforcement | 4 | 9min | 2min |
| 05-grower-onboarding | 2 | 6min | 3min |
| 06-invite-system | 2 | 16min | 8min |
| 07-user-management | 1 | 3min | 3min |

**Recent Trend:**
- Last 5 plans: 07-01 (3min), 06-02 (11min), 06-01 (5min), 05-02 (2min), 05-01 (4min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Stabilization before features -- fix session bugs and security issues before adding roles/invites
- [Roadmap]: 8 phases derived from 28 requirements across 5 categories (AUTH, ONBD, ROLE, USER, SUBS)
- [Roadmap]: Research recommends Custom Access Token Hook over app_metadata for role injection into JWT
- [01-02]: Two-tier error boundary: route-level in AppLayout + component-level around MapView
- [01-02]: Map recovery via key increment forces WebGL canvas remount
- [01-02]: No technical error details shown to users -- friendly icon + message only
- [01-01]: Promise.race with 5s timeout on RPC calls instead of AbortController -- null result triggers retry UI
- [01-01]: Extracted PowerSyncLoadingScreen component for clean useState/useEffect lifecycle
- [01-01]: Spinner-only loading screens with "Taking longer than usual..." after 5 seconds
- [01-03]: Private schema pattern: private._impl() with SECURITY DEFINER + public SECURITY DEFINER wrappers (originally INVOKER, fixed in 06-02)
- [01-03]: generate_random_code fully private (no public wrapper) to prevent API exposure
- [01-03]: Debug logging gated behind localStorage.__ag_debug flag, checked once at module load
- [01-03]: HIGH-sensitivity upsert data logs deleted entirely rather than gated
- [02-01]: localStorage cache-aside pattern for onboarding status -- cache on success, serve from cache on failure
- [02-01]: PowerSync connector returns null for permanent auth errors, throws for retryable -- stops infinite retry loops
- [02-01]: Onboarding cache cleared before state setters in signOut for guaranteed cleanup
- [02-02]: useRef for userInitiatedSignOut (not state) -- only needs synchronous reads during auth events
- [02-02]: Session expired UI in RequireAuth rather than separate route -- simpler, no URL change
- [02-02]: Dual connectivity check: useOnlineStatus pre-submit guard + navigator.onLine catch fallback
- [03-01]: String literal unions over enums for Role/Action types -- zero runtime overhead
- [03-01]: Set<Action> for PERMISSION_MATRIX -- O(1) lookup performance
- [03-01]: farm_members.role is authoritative role source, not users.role -- deliberate separation
- [03-01]: Four-role hierarchy: super_admin > grower > admin > meter_checker
- [03-02]: Updated DEFAULT parameter values from 'member' to 'meter_checker' on public wrappers and private impls
- [03-02]: super_admin in farm_members but excluded from farm_invites CHECK (not assignable via invite)
- [03-03]: AddUserModal keeps local Role type limited to invitable roles (meter_checker/admin), not importing from permissions.ts
- [03-03]: Three separate sync rule buckets for invite visibility: super_admin, grower, admin
- [03-04]: Hook in public schema (Supabase Auth requirement) with REVOKE from authenticated/anon/public for security
- [03-04]: Primary farm selection via ORDER BY created_at ASC LIMIT 1 for users with multiple memberships
- [03-04]: Null claims for users without farm membership -- onboarding-safe, no errors
- [01-04]: isFetchingOnboarding as separate boolean state -- simpler API, one concern per flag
- [01-04]: resetKeys={[location.pathname]} on ErrorBoundary for automatic reset on route navigation
- [01-05]: useWebWorker:false forces WASM in main thread where service worker intercepts fetch -- safe for simple query workloads
- [01-05]: retryCount pattern re-triggers useEffect without needing to modify setupPowerSync singleton logic
- [01-05]: No technical error details shown to user in DB init error UI -- friendly messaging only
- [04-01]: RequireRole returns null during loading (not redirect) to avoid flash-redirect while PowerSync loads
- [04-01]: Only /subscription route protected by RequireRole -- other routes accessible to all authenticated users
- [04-01]: NavItem interface with optional requiredAction field for extensible per-item permission checks
- [04-02]: Conditional rendering (not CSS display:none) for all permission gates
- [04-02]: Defense-in-depth pattern: UI gate + handler gate + write guard in DashboardPage
- [04-02]: Long-press handler gated at function level (early return) rather than removing callback from MapView
- [04-03]: Zustand v5 installed as new dependency (was in tech stack docs but not in package.json)
- [04-03]: FarmSelector uses Headless UI Listbox with anchor positioning for dropdown
- [04-03]: Own farm shown first in dropdown with (my farm) label
- [04-03]: Override indicator (viewing) in yellow-300 for visual distinction
- [04-04]: Three-state ref (undefined | null | Role) for first-render detection vs role-loading vs known-role
- [04-04]: Only known-to-different-known transitions trigger reload to avoid false positives
- [04-04]: useActiveFarmStore.getState() pattern for Zustand access inside callback (not hook)
- [05-01]: OtpInput uses configurable length prop (default 6) for reusability
- [05-01]: RequireNotOnboarded only redirects when BOTH hasProfile AND hasFarmMembership are true
- [05-01]: CreateFarmPage back navigates to profile (not sign out) for non-destructive UX
- [05-02]: VerifyPage redirect uses resolveNextRoute(onboardingStatus) for consistent routing across all entry points
- [05-02]: CreateFarmPage navigates to '/' instead of '/app/dashboard' for canonical route handling
- [05-02]: 3-attempt retry with 500ms delay for refreshOnboardingStatus; self-corrects on next app load if all fail
- [06-02]: SECURITY DEFINER (not INVOKER) required on all public wrappers delegating to private schema functions
- [06-02]: Migration history repair: timestamped remote migrations marked reverted, numbered local migrations marked applied
- [07-01]: INTEGER for is_disabled (not BOOLEAN) because PowerSync does not support BOOLEAN type
- [07-01]: alert() for disabled-user message -- simple enough for rare edge case, avoids over-engineering
- [07-01]: Same role hierarchy for enable as disable -- only those who can disable can re-enable
- [07-01]: Disabled-user query in AppLayout (not AuthProvider) since it requires PowerSync inside PowerSyncProvider

### Pending Todos

- [04-03]: PowerSync Dashboard sync rules for farms table need manual verification for super_admin cross-farm access
- [06-02]: PowerSync Dashboard sync rules updated -- DONE
- [06-02]: E2E manual testing of complete invite flow -- DONE (verified by user)

### Blockers/Concerns

- [Research]: PowerSync sync rules SQL subset limitations not fully documented -- need to test complex role checks during Phase 3
- [Research]: SECURITY DEFINER functions in public schema exposed via API -- RESOLVED in 01-03 (moved to private schema)
- [Research]: get_onboarding_status RPC is a bottleneck (infinite spinner on failure) -- addressed in Phase 1

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 07-01-PLAN.md (Disable/Enable Infrastructure)
Resume file: None
