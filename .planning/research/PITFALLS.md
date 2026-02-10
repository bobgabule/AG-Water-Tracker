# Pitfalls Research

**Domain:** Agricultural water tracking PWA with role-based auth (Supabase + PowerSync offline-first)
**Researched:** 2026-02-10
**Confidence:** HIGH (verified via Context7, Supabase docs, PowerSync docs, and codebase analysis)

## Critical Pitfalls

### Pitfall 1: Stale Data on Local Device After Role Downgrade or Removal

**What goes wrong:**
When a user's role is changed (e.g., admin demoted to member) or they are removed from a farm, the locally cached SQLite database (managed by PowerSync) still contains all the data they previously had access to. PowerSync sync rules determine what data is *synced* to the client, but removal from a bucket does not actively delete already-synced data from the local database. The user retains read access to sensitive data (invites, other members' details, admin-only views) until the app calls `disconnectAndClear()` or a full re-sync occurs.

**Why it happens:**
PowerSync's sync rules are *additive* -- they control what flows to the client, not what gets removed. When bucket membership changes (e.g., the user's role no longer matches the `farm_invites_owner` bucket parameter), the PowerSync service stops sending new data for that bucket but does not issue delete commands for already-synced rows. The current codebase has no mechanism to detect role changes and force a re-sync.

**How to avoid:**
1. Listen for role changes via PowerSync watch queries on `farm_members` -- if the current user's role changes, immediately call `disconnectAndClear()` and re-initialize the sync connection.
2. Add a `useRoleChangeDetector` hook that compares the user's current role from `farm_members` with a cached value. On mismatch, trigger re-authentication and full re-sync.
3. For member removal, the `onAuthStateChange` handler should detect when `get_onboarding_status()` returns no farm membership and redirect to an appropriate screen while clearing local data.

**Warning signs:**
- Admin demotes a user, but that user can still see the "Team Management" section in settings until they manually sign out.
- A removed user can still browse cached wells and readings offline.
- `PendingInvitesList` still shows invite data for a user whose role was downgraded from admin to member.

**Phase to address:**
Phase 1 (Foundation/Stabilization) -- This must be handled before introducing new roles, because the existing `owner`/`admin`/`member` roles already have this problem.

---

### Pitfall 2: RLS Policy Recursion and Performance Degradation

**What goes wrong:**
The existing codebase already experienced infinite RLS recursion (fixed in migration 006), and the pattern is likely to recur when adding new role-based policies. RLS policies that reference `farm_members` to check roles involve a SELECT on a table that itself has RLS policies -- creating recursive evaluation. Even when avoided via `SECURITY DEFINER` helper functions, performance degrades significantly on large datasets because the helper functions are called per-row unless wrapped in a subquery.

**Why it happens:**
The `get_user_farm_ids()` and `get_user_admin_farm_ids()` functions are `SECURITY DEFINER` + `STABLE`, which is correct. However, when used directly in a `USING` clause like `farm_id IN (SELECT get_user_farm_ids())`, PostgreSQL may call the function once per row rather than once per query. The existing migration 011 uses this pattern for all tables (farms, wells, allocations, readings). With 4 new roles (super_admin, grower, admin, meter_checker), additional helper functions will multiply this pattern.

**How to avoid:**
1. Wrap helper function calls in a scalar subquery: `farm_id IN (SELECT * FROM get_user_farm_ids())` -- this allows the planner to cache the result.
2. Better yet, use the pattern: `(SELECT auth.uid()) = user_id` for simple ownership checks, which enables Postgres to compute it once via `initPlan`.
3. Add indexes on `farm_members(user_id, role)` and `farm_members(farm_id, user_id)` if they don't exist already.
4. For the new 4-role system, create a single `get_user_role_for_farm(p_farm_id UUID)` function instead of multiple `get_user_*_farm_ids()` functions. This reduces the number of helper functions and centralizes role logic.
5. Move all `SECURITY DEFINER` helper functions to a `private` schema (not `public`) to prevent them from being callable via Supabase's API.

**Warning signs:**
- Queries that were fast with 10 wells become slow with 100+ wells.
- Supabase dashboard shows high query latency on tables with RLS.
- `EXPLAIN ANALYZE` shows `Filter` operations instead of `Index Scan` on policy-related subqueries.
- API calls via `supabase.from(table).select()` time out.

**Phase to address:**
Phase 2 (Role System Implementation) -- Create optimized RLS policies from the start rather than retrofitting.

---

### Pitfall 3: PowerSync Sync Rules and Supabase RLS Policy Mismatch

**What goes wrong:**
PowerSync sync rules and Supabase RLS policies are two independent access control systems that must stay in sync. When a new role like `meter_checker` is introduced, developers update the Supabase RLS policies (migrations) but forget to update the PowerSync sync rules on the dashboard (or vice versa). This creates a state where:
- The client receives data via PowerSync sync that it cannot write back (RLS blocks the upload), causing permanent upload errors.
- Or the RLS allows writes but PowerSync doesn't sync the relevant data down, so the UI shows stale/empty data.

The current codebase already has a documentation comment noting that sync rules are "documentation only" and must be manually configured on the PowerSync dashboard -- a manual step that is easy to miss.

**Why it happens:**
PowerSync sync rules live on the PowerSync dashboard (not in the codebase), while Supabase RLS lives in SQL migrations. There is no automated mechanism to verify they are consistent. The `docs/powersync-sync-rules.yaml` file is documentation-only -- it is not deployed anywhere. When adding new roles, developers change migrations and forget the dashboard step.

**How to avoid:**
1. Add a pre-deployment checklist item: "Update PowerSync dashboard sync rules to match migration changes."
2. Create a `sync-rules-verification` test script that queries both PowerSync bucket definitions and Supabase RLS policies to check for mismatches.
3. For each new role (`meter_checker`, `grower`), document which buckets that role should have access to in the YAML file, then deploy to the dashboard.
4. Consider using PowerSync's self-hosted service (if feasible) to manage sync rules via config files in the repo.
5. The existing `farm_invites_owner` and `farm_invites_admin` sync rule duplication pattern (needed because PowerSync doesn't support `IN` with literal lists) will need additional buckets for each new role -- plan this upfront.

**Warning signs:**
- New role users see empty dashboard after login (sync rules don't include them).
- PowerSync connector logs `[PowerSync] Permanent upload error, discarding transaction` for operations the role should be allowed to do.
- `farm_invites` data appears for roles that should not see it.
- Offline-created records disappear after sync (RLS blocks the upload, PowerSync discards the transaction).

**Phase to address:**
Phase 2 (Role System) and ongoing -- Every phase that modifies data access must update both systems.

---

### Pitfall 4: SECURITY DEFINER Functions Exposed via Supabase API

**What goes wrong:**
All SECURITY DEFINER functions in the `public` schema are automatically exposed through the Supabase PostgREST API and can be called by any authenticated user via `supabase.rpc()`. The current codebase has 7 SECURITY DEFINER functions in the `public` schema: `get_my_farm_id()`, `get_user_farm_ids()`, `get_user_admin_farm_ids()`, `create_farm_and_membership()`, `join_farm_with_code()`, `invite_user_by_phone()`, `get_onboarding_status()`. While the RPC functions validate permissions internally, the helper functions (`get_user_farm_ids`, `get_user_admin_farm_ids`) return sensitive data (farm IDs where a user has admin access) and can be called directly from the client.

**Why it happens:**
Supabase exposes all functions in the `public` schema via the REST API by default. Developers create SECURITY DEFINER functions in `public` for convenience, not realizing they become API endpoints. This is a well-documented Supabase security issue -- the official docs explicitly warn against this.

**How to avoid:**
1. Move all helper functions (`get_user_farm_ids`, `get_user_admin_farm_ids`, `get_my_farm_id`) to a `private` schema: `CREATE SCHEMA IF NOT EXISTS private;` then recreate them in `private`.
2. Only keep intentionally user-facing RPCs in `public` (like `create_farm_and_membership`, `invite_user_by_phone`).
3. Add an API security check: query `SELECT * FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true;` to find all exposed SECURITY DEFINER functions.
4. When adding new role-check functions for the 4-role system, create them in the `private` schema from the start.

**Warning signs:**
- A user can call `supabase.rpc('get_user_admin_farm_ids')` from the browser console and see all farms they admin.
- Supabase Dashboard "Database > Functions" shows SECURITY DEFINER functions in public.
- The Supabase security advisor (Performance and Security Advisors) flags these functions.

**Phase to address:**
Phase 1 (Stabilization) -- Fix before adding more SECURITY DEFINER functions for new roles.

---

### Pitfall 5: Offline-Created Records Silently Discarded by PowerSync Connector

**What goes wrong:**
The current `uploadData()` connector treats all permanent errors (PostgreSQL constraint violations `23xxx`, RLS violations `42501`, PostgREST errors `PGRST*`) by calling `transaction.complete()` -- which silently discards the failed operations. When a meter_checker creates a well offline (which they can do because there are no client-side role checks), the write is accepted locally and appears in the UI. When the device comes online, the upload fails because RLS blocks the insert (only admins/owners can create wells in Supabase). The connector silently discards the transaction. The well disappears from the UI with no user notification.

**Why it happens:**
The connector's error handling follows the recommended PowerSync pattern of completing permanent-error transactions to avoid blocking the upload queue. However, the codebase has no mechanism to:
1. Validate client-side permissions before allowing writes.
2. Notify users when their data was rejected by the server.
3. Preserve rejected records for later review.

The existing code at `DashboardPage.tsx` line 82 shows `db.execute(INSERT INTO wells ...)` with no role check -- any authenticated user can write to the local PowerSync database.

**How to avoid:**
1. Add client-side role checks before allowing write operations. Create a `usePermissions()` hook that reads the current user's role from `farm_members` and exposes permission booleans like `canCreateWell`, `canInviteUser`, etc.
2. Disable UI actions (buttons, forms) based on role -- don't just hide them, disable the underlying write path.
3. In the connector's permanent error handler, log discarded transactions to a local `sync_errors` table and surface them to the user via a notification.
4. Consider implementing a "rejected writes" queue that shows users what was rejected and why.

**Warning signs:**
- User creates a record offline, sees it in the UI, then it "disappears" after going online.
- `[PowerSync] Permanent upload error, discarding transaction` appears in console logs but no user-facing notification.
- Users report "lost data" that was created while offline.

**Phase to address:**
Phase 3 (Permissions & Role Enforcement) -- Must be solved alongside client-side permission checks.

---

### Pitfall 6: get_onboarding_status() RPC as Authentication Bottleneck

**What goes wrong:**
The `get_onboarding_status()` RPC is called on every auth state change (INITIAL_SESSION, SIGNED_IN, USER_UPDATED) and performs multiple database operations including an auto-match flow (reading `auth.users`, querying `farm_invites`, inserting into `users` and `farm_members`, updating `farm_invites`). If this RPC fails or times out, `onboardingStatus` remains `null`, which causes `RequireOnboarded` to show an infinite spinner (the existing known issue). Adding role validation, subscription checks, and user limit enforcement to this function will make it even more fragile.

**Why it happens:**
The architecture funnels all authentication/authorization logic through a single RPC that does too much: profile check, farm membership check, phone invite matching, profile auto-creation, and membership auto-creation. Each new feature (role assignment, subscription validation, user limits) adds more logic to this single function, increasing its failure surface.

**How to avoid:**
1. Split `get_onboarding_status()` into focused functions: `get_profile_status()`, `match_phone_invite()`, `check_subscription()`.
2. Add a timeout/fallback: if the RPC fails, use locally cached onboarding status from PowerSync (the `users` and `farm_members` tables are already synced).
3. Make the auto-match flow idempotent and retryable -- use `ON CONFLICT DO NOTHING` (already done) and handle partial failures.
4. Add error boundaries around `RequireOnboarded` so a failed onboarding check shows a retry button instead of an infinite spinner.
5. For session recovery, try the locally cached data first, then verify with the server in the background.

**Warning signs:**
- Infinite spinner on app load (already happening -- documented as known issue).
- Increasing latency of the `get_onboarding_status` RPC as more logic is added.
- Users stuck on the onboarding screen despite being fully onboarded (server-side check fails, no local fallback).
- New users on slow connections see the spinner for 10+ seconds.

**Phase to address:**
Phase 1 (Stabilization) -- Fix the existing infinite spinner before adding more logic to this RPC.

---

### Pitfall 7: Role Enum Mismatch Across Three Systems

**What goes wrong:**
Roles are stored as plain text strings in three places: Supabase database (`farm_members.role`), PowerSync local schema (`farm_members.role` as `column.text`), and TypeScript client code (hardcoded string comparisons like `role === 'owner' || role === 'admin'`). There is no single source of truth for valid role values. When transitioning from the current 3-role system (owner, admin, member) to the 4-role system (super_admin, grower, admin, meter_checker), any mismatch between these systems causes silent failures:
- RLS policies check for role strings that don't exist in the data.
- Client-side role checks miss new roles.
- Sync rules filter on old role names.

**Why it happens:**
The current codebase uses string literals everywhere for roles: `invite_user_by_phone()` validates against `('admin', 'member')`, `get_user_admin_farm_ids()` checks `role IN ('owner', 'admin')`, `SettingsPage.tsx` checks `role === 'owner' || role === 'admin'`, and the AddUserModal offers only `'member' | 'admin'` as choices. There is no TypeScript enum or database constraint that enforces the valid set of roles.

**How to avoid:**
1. Create a single `Role` TypeScript enum/union type in `src/types/roles.ts` and use it everywhere in the client.
2. Add a PostgreSQL CHECK constraint on `farm_members.role`: `CHECK (role IN ('super_admin', 'grower', 'admin', 'meter_checker'))`.
3. Update all SQL functions, RLS policies, and sync rules simultaneously when changing roles.
4. Create a migration test that verifies all role strings in RLS policies, RPCs, and sync rules match the CHECK constraint.
5. In the transition period, support both old and new role names to avoid breaking existing data.

**Warning signs:**
- New role users can't see any data (role string doesn't match any sync rule bucket parameter).
- `isAdminOrOwner` check in `SettingsPage.tsx` still uses old role names, hiding admin features from `grower` users who should see them.
- `invite_user_by_phone()` rejects the new role names because validation hasn't been updated.
- PowerSync console shows `42501` errors for users with new role strings.

**Phase to address:**
Phase 2 (Role System) -- Define the role enum as the first task before any role-dependent code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Roles as plain text strings (no enum/constraint) | Faster development, no migration needed | Silent mismatches between DB, sync rules, and client code; hard-to-debug authorization failures | Never -- add CHECK constraint and TypeScript enum from day one |
| `console.log` spam in production (19 occurrences across 7 files) | Debugging during development | Exposes internal state to users, performance impact, fills browser console | Only during active debugging -- strip before release |
| `SECURITY DEFINER` functions in `public` schema | Simpler migration scripts | API-exposed helper functions leak farm IDs and role data | Never for helper functions -- move to `private` schema |
| `get_onboarding_status()` doing auto-match + profile creation | Single RPC handles everything | Single point of failure blocking auth; gets more complex and fragile with each feature | MVP only -- split before adding subscription/role logic |
| No client-side permission checks before PowerSync writes | Any user can create any record locally | Data silently discarded on sync; user sees "lost" data | Never -- always validate before local write |
| Sync rules in YAML documentation file only (not deployed) | Documents intent | Manual dashboard updates are forgotten, causing sync/RLS mismatches | Only if a verification script validates dashboard matches YAML |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PowerSync + Supabase RLS | Writing data locally that RLS will reject on upload | Add client-side permission checks that mirror RLS logic; handle rejected transactions with user notification |
| PowerSync sync rules + new roles | Adding a new role but not adding corresponding bucket definitions | Create a role-to-bucket mapping document; update sync rules every time a migration changes roles |
| Supabase Auth (Phone OTP) + invite flow | Assuming `auth.users.phone` is immediately available after OTP verify | The phone is available in `auth.users` after OTP verification, but `get_onboarding_status()` runs as SECURITY DEFINER so it can access `auth.users` -- verify this works for newly created auth accounts |
| PowerSync `disconnectAndClear()` + sign out | Calling `disconnectAndClear()` after `supabase.auth.signOut()` fails silently | The existing code handles this correctly (catches sign-out errors and still clears PowerSync), but role changes should also trigger `disconnectAndClear()` |
| Twilio SMS + Supabase Edge Functions | Edge function fails but invite record is already created in DB | The existing code handles SMS failure gracefully (shows warning), but the invite record persists even if SMS never sends -- add a status field to track SMS delivery |
| PowerSync `farm_invites` PK mapping | `farm_invites` uses `code` as PK in Supabase but `id` in PowerSync (via `SELECT code AS id`) | All client code must use `invite.id` knowing it's actually the invite code; documented in MEMORY.md but easy to forget when writing new queries |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS helper functions called per-row instead of once | Slow SELECT queries, increasing latency with more rows | Wrap in `(SELECT func())` subquery for initPlan caching; add compound index on `farm_members(user_id, role)` | 100+ wells per farm, 20+ farm members |
| PowerSync syncing full tables instead of filtered subsets | High bandwidth usage, slow initial sync, large local DB | Use precise bucket parameters; only sync columns needed for display; consider pagination for readings | 1000+ readings per well, 50+ wells |
| `get_onboarding_status()` doing writes (INSERT, UPDATE) on every auth state change | Unnecessary DB writes on token refresh, app foreground | Add guards: only run auto-match if no existing farm membership; cache result and only re-fetch on explicit actions | Any scale -- happens on every app open |
| Multiple sync rule buckets with overlapping data queries | Same row synced multiple times (once per matching bucket); increased bandwidth and storage | Consolidate overlapping buckets; verify each row appears in exactly one bucket's data query | When farm has multiple admins/owners |
| `useQuery` re-executing on every render due to unstable parameters | UI jank, excessive SQLite queries | Memoize query parameters with `useMemo`; use stable references for arrays/objects passed to `useQuery` | Complex list views with filters |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `SECURITY DEFINER` helper functions in `public` schema callable via API | Any authenticated user can call `get_user_admin_farm_ids()` to enumerate farms they admin, or `get_user_farm_ids()` to enumerate all farm memberships | Move helper functions to `private` schema; only keep user-facing RPCs in `public` |
| No client-side validation of role before allowing write operations | Users can create records offline that will be rejected by RLS on sync, causing data loss | Implement `usePermissions()` hook; disable write UI for unauthorized roles |
| Invite phone numbers stored without encryption | Phone numbers visible in `farm_invites` table to anyone with admin/owner access via PowerSync | Evaluate if phone numbers need to be encrypted at rest; at minimum, mask phone display in UI for non-creating users |
| SMS invite link goes to generic app URL, not deep link with token | Anyone who sees the SMS can access the app; no way to verify the SMS recipient is the one who clicks | Implement deep links with invite token; validate token matches phone during OTP flow |
| `send-invite-sms` Edge Function has `Access-Control-Allow-Origin: *` | Any origin can call the function if they have a valid auth token | Restrict CORS to your app's domain in production |
| No rate limiting on `invite_user_by_phone` RPC | Admin could create unlimited invites, consuming Twilio SMS credits | Add rate limiting: max invites per farm per hour; track invite count in a window |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when offline-created data is rejected on sync | User creates well while offline, it appears in the app, then silently disappears when online | Show notification: "1 record was rejected by the server"; provide detail on what failed and why |
| Infinite spinner when `get_onboarding_status()` fails | User stuck on loading screen with no way to recover except clearing browser data | Add timeout (5s), show error message with "Retry" button; fall back to locally cached status |
| Role change takes effect only after sign-out/sign-in | User's role is updated but their UI doesn't reflect it until they manually sign out | Watch `farm_members` table for role changes; trigger `disconnectAndClear()` + re-sync automatically |
| No confirmation before destructive actions (revoke invite, remove member) | Accidental taps on mobile can remove team members | Add confirmation dialog for all destructive actions |
| Adding a user shows "Invite Sent" even if SMS failed | User thinks teammate was notified but they weren't | Already partially handled (shows SMS warning), but should make the warning more prominent and suggest manual notification |

## "Looks Done But Isn't" Checklist

- [ ] **Role system:** Often missing role validation at the client-side write path -- verify every `db.execute(INSERT/UPDATE)` checks user permissions first
- [ ] **Invite flow:** Often missing handling for "user already has an account but is invited to a new farm" -- verify `get_onboarding_status()` doesn't skip existing profiles in the auto-match
- [ ] **Sync rules:** Often missing new role buckets -- verify every role in the CHECK constraint has corresponding bucket definitions on the PowerSync dashboard
- [ ] **RLS policies:** Often missing UPDATE/DELETE policies for new tables -- verify all CRUD operations have policies, not just SELECT and INSERT
- [ ] **Offline sync:** Often missing user notification for rejected writes -- verify the PowerSync connector notifies the UI when transactions are discarded
- [ ] **Session recovery:** Often missing fallback for failed RPC calls -- verify the app can function using locally cached data when the server is unreachable
- [ ] **Error boundaries:** Often missing around route-level components -- verify `DashboardPage`, `SettingsPage`, and onboarding pages are wrapped in error boundaries
- [ ] **Phone normalization:** Often missing edge cases for international numbers -- verify `invite_user_by_phone()` handles numbers already in E.164 format without double-prefixing
- [ ] **Subscription limits:** Often missing enforcement at the database level -- verify user count checks happen in a SECURITY DEFINER function, not just the client

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale data after role change | LOW | Call `disconnectAndClear()`, re-authenticate, re-sync. User data is on server -- nothing lost |
| RLS recursion causing 500 errors | MEDIUM | Create SECURITY DEFINER helper function in `private` schema, update policy to use it, deploy migration |
| Sync rules / RLS mismatch | MEDIUM | Audit both systems, update PowerSync dashboard, verify with test user per role. May require re-deployment |
| SECURITY DEFINER functions exposed | LOW | Create `private` schema, move functions, update RLS policies to reference new schema. One migration |
| Silently discarded offline writes | HIGH | Data is lost -- no recovery. Prevention is the only strategy. Must implement rejected-writes logging before users encounter this |
| Onboarding RPC failure blocking auth | LOW | Add client-side fallback using locally cached data; add retry logic and error UI. Can be done incrementally |
| Role enum mismatch | MEDIUM | Audit all three systems (DB, sync rules, client). Add CHECK constraint and TypeScript type. Update all string comparisons. Requires coordinated migration + code + dashboard update |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale data after role change | Phase 1: Stabilization | Manually test: change user's role in DB, verify their local data updates within 30 seconds |
| RLS recursion/performance | Phase 2: Role System | Run `EXPLAIN ANALYZE` on all RLS-protected queries with 100+ rows; verify no sequential scans |
| Sync rules / RLS mismatch | Phase 2 + every subsequent phase | Create a checklist comparing YAML file with dashboard; run after every migration |
| SECURITY DEFINER in public schema | Phase 1: Stabilization | Query `pg_proc` for SECURITY DEFINER functions in public; verify only intentional RPCs remain |
| Silently discarded offline writes | Phase 3: Permissions | Test: create record as unauthorized role while offline, go online, verify user notification appears |
| Onboarding RPC bottleneck | Phase 1: Stabilization | Test: block RPC call, verify app still loads with cached data and shows retry option |
| Role enum mismatch | Phase 2: Role System | TypeScript compilation should fail if unknown role string is used; DB should reject unknown roles via CHECK |

## Sources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- Confirmed infinite recursion pattern and SECURITY DEFINER best practices
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- Function wrapping for initPlan caching
- [Supabase RBAC Documentation](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- Custom claims approach as alternative
- [PowerSync Sync Rules Documentation](https://docs.powersync.com/usage/sync-rules) -- Bucket definitions, parameter queries, security
- [PowerSync Client Parameters Security Warning](https://docs.powersync.com/usage/sync-rules/advanced-topics/client-parameters) -- Client parameters must not be used for authorization
- [PowerSync Supabase Integration Guide](https://docs.powersync.com/integration-guides/supabase-+-powersync) -- Connector patterns, uploadData error handling
- [PowerSync Connector Performance](https://github.com/powersync-ja/powersync-docs/blob/main/integrations/supabase/connector-performance.mdx) -- Batch upload patterns, fatal error codes
- [Supabase Infinite Recursion Discussion #1138](https://github.com/orgs/supabase/discussions/1138) -- Community discussion of the recursion problem and solutions
- [Supabase API Security Documentation](https://supabase.com/docs/guides/api/securing-your-api) -- Public schema exposure of SECURITY DEFINER functions
- Codebase analysis: `supabase/migrations/006_fix_rls_recursion.sql` -- Existing recursion fix
- Codebase analysis: `supabase/migrations/011_new_rls_policies.sql` -- Current RLS helper function pattern
- Codebase analysis: `src/lib/powersync-connector.ts` -- Current error handling strategy
- Codebase analysis: `src/lib/AuthProvider.tsx` -- Onboarding status bottleneck
- Project memory: `.claude/projects/c--Users-Bobits-AG-Water-Tracker/memory/MEMORY.md` -- Known issues and decisions

---
*Pitfalls research for: AG Water Tracker -- Role-Based Auth & Invite Flow*
*Researched: 2026-02-10*
