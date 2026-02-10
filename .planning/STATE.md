# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online
**Current focus:** Phase 3 - Role Foundation

## Current Position

Phase: 3 of 8 (Role Foundation)
Plan: 4 of 4 in current phase
Status: Phase Complete
Last activity: 2026-02-10 -- Completed 03-04-PLAN.md (Custom Access Token Hook)

Progress: [████░░░░░░] 32%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 5min
- Total execution time: 0.7 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-session-stability | 3 | 14min | 5min |
| 02-offline-session-resilience | 2 | 13min | 7min |
| 03-role-foundation | 4 | 14min | 4min |

**Recent Trend:**
- Last 5 plans: 03-04 (3min), 03-03 (3min), 03-02 (4min), 03-01 (4min), 02-02 (5min)
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
- [01-03]: Private schema pattern: private._impl() with SECURITY DEFINER + public SECURITY INVOKER wrappers
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: PowerSync sync rules SQL subset limitations not fully documented -- need to test complex role checks during Phase 3
- [Research]: SECURITY DEFINER functions in public schema exposed via API -- RESOLVED in 01-03 (moved to private schema)
- [Research]: get_onboarding_status RPC is a bottleneck (infinite spinner on failure) -- addressed in Phase 1

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 03-04-PLAN.md (Custom Access Token Hook) -- Phase 3 complete
Resume file: None
