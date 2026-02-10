---
phase: 03-role-foundation
plan: 04
subsystem: auth
tags: [jwt, supabase, postgresql, powersync, custom-hook, claims]

# Dependency graph
requires:
  - phase: 03-02
    provides: "farm_members table with role column and RLS policies"
provides:
  - "Custom Access Token Hook that injects user_role and farm_id into JWT app_metadata claims"
  - "supabase_auth_admin grants and RLS policy for hook execution"
  - "JWT claims path: app_metadata.user_role and app_metadata.farm_id"
affects: [04-invite-flow, powersync-sync-rules, rls-policies]

# Tech tracking
tech-stack:
  added: []
  patterns: [custom-access-token-hook, jwt-claim-injection]

key-files:
  created:
    - supabase/migrations/022_custom_access_token_hook.sql
  modified: []

key-decisions:
  - "Hook in public schema (Supabase Auth requirement) with REVOKE from authenticated/anon/public for security"
  - "Primary farm selection via ORDER BY created_at ASC LIMIT 1 for users with multiple memberships"
  - "Null claims for users without farm membership (onboarding-safe)"

patterns-established:
  - "Custom Access Token Hook pattern: public schema function with supabase_auth_admin grants and explicit REVOKE from user roles"
  - "JWT claim injection: app_metadata.user_role and app_metadata.farm_id available in all tokens"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 3 Plan 4: Custom Access Token Hook Summary

**Custom Access Token Hook injecting user_role and farm_id into JWT app_metadata claims via supabase_auth_admin-privileged PL/pgSQL function**

## Performance

- **Duration:** 3 min (code auto, dashboard manual)
- **Started:** 2026-02-10T08:39:00Z
- **Completed:** 2026-02-10T08:42:10Z
- **Tasks:** 2 (1 auto + 1 human-action)
- **Files modified:** 1

## Accomplishments
- Custom Access Token Hook function created with proper Supabase hook contract (jsonb in, jsonb out)
- Permission grants restrict execution to supabase_auth_admin only; authenticated/anon/public explicitly revoked
- RLS policy allows supabase_auth_admin to read farm_members for role lookup
- Hook manually enabled in Supabase Dashboard by user -- JWT tokens now contain role and farm_id claims
- Null-safe handling for users without farm membership (onboarding flow)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Custom Access Token Hook migration** - `5fa1709` (feat)
2. **Task 2: Enable Custom Access Token Hook in Supabase Dashboard** - N/A (manual dashboard configuration, user confirmed)

## Files Created/Modified
- `supabase/migrations/022_custom_access_token_hook.sql` - Custom Access Token Hook function with grants, revokes, and RLS policy for supabase_auth_admin

## Decisions Made
- **Hook in public schema:** Supabase Auth requires hook functions in public schema; security maintained via REVOKE from authenticated/anon/public
- **Primary farm selection:** Users with multiple farm memberships get the earliest-joined farm (ORDER BY created_at ASC LIMIT 1)
- **Null claims for no membership:** Returns event with null user_role and farm_id when user has no farm_members row, allowing onboarding to proceed without errors
- **STABLE volatility:** Function marked STABLE (not IMMUTABLE) since it reads from farm_members table

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Dashboard configuration was completed during execution:**
- Supabase Dashboard -> Authentication -> Hooks -> Custom Access Token Hook enabled
- User confirmed hook is active and functioning

## Next Phase Readiness
- JWT tokens now carry user_role and farm_id in app_metadata claims
- PowerSync sync rules can use `request.jwt() ->> 'app_metadata.farm_id'` for bucket routing
- RLS policies can optimize by reading role from JWT instead of querying farm_members
- Phase 3 (Role Foundation) is now complete -- all 4 plans finished
- Ready to proceed to Phase 4 (Invite Flow)

## Self-Check: PASSED

- [x] `supabase/migrations/022_custom_access_token_hook.sql` -- FOUND
- [x] Commit `5fa1709` -- FOUND
- [x] `03-04-SUMMARY.md` -- FOUND

---
*Phase: 03-role-foundation*
*Completed: 2026-02-10*
