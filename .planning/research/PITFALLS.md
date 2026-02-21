# Domain Pitfalls

**Domain:** Subscription tier management, role-based permission enforcement, login-only auth flow, and farm data isolation for an offline-first agricultural water management PWA
**Researched:** 2026-02-22
**Overall Confidence:** HIGH (based on codebase analysis, Supabase RLS docs, PowerSync sync architecture, and direct examination of 32 migrations, auth provider, connector, permissions module, and route guards)

---

## Critical Pitfalls

Mistakes that cause data leaks between farms, broken auth flows, lost offline data, or require emergency rollbacks.

---

### Pitfall 1: Subscription Tier Config Table Not Available Offline -- Limits Silently Bypass

**What goes wrong:** The new `subscription_tiers` and `app_settings` tables are created in Supabase, but if they are not added to PowerSync sync rules AND the client schema, the app has NO access to tier limits when offline. The existing `PLAN_LIMITS` constant in `src/lib/subscription.ts` is hardcoded to "Basic" plan with fixed seat limits. If the migration to DB-driven tiers replaces these hardcoded values without ensuring offline availability, the app silently falls back to no enforcement when the user is offline.

**Why it happens:** PowerSync only syncs tables that have bucket definitions in the sync rules AND matching table definitions in `powersync-schema.ts`. Config tables are easy to forget because they feel like "server-side" data, not "user data." Developers naturally think "we'll just query this from Supabase" without realizing that offline-first means the app must work WITHOUT Supabase.

**Consequences:**
- Offline users can create wells beyond their tier limit (local SQLite has no constraint)
- Offline users can invite beyond seat limits (invite form checks `useSeatUsage` but tier limits are unknown)
- When syncing back online, creates could be rejected by RLS/DB constraints -- triggering the connector's `isPermanentError` path which DISCARDS the transaction permanently
- Alternatively, if no server-side enforcement exists, limits are purely bypassed

**Prevention:**
- Add `subscription_tiers` and `app_settings` to PowerSync sync rules as a GLOBAL bucket (not farm-scoped) -- these are read-only config tables all users need
- Add corresponding table definitions to `powersync-schema.ts` with `column.text` and `column.integer` columns
- Add both tables to the sync rules YAML documentation
- Do NOT add them to `ALLOWED_TABLES` in the connector (these are read-only, never written by client)
- Create a `useSubscriptionTier` hook that reads from local SQLite (PowerSync), with the current `PLAN_LIMITS` as a hardcoded fallback if the tier row hasn't synced yet
- Ensure `useSeatUsage` consumes limits from the synced tier, not the hardcoded constant
- Server-side enforcement is defense-in-depth: tier limits should also be checked in Supabase RPCs (invite creation, well creation) so even a compromised or outdated client cannot exceed limits

**Detection:** Go offline, open the subscription page. If it shows "Basic" when the farm is on "Pro" (or vice versa), the config table isn't syncing.

**Confidence:** HIGH -- directly observed that current `PLAN_LIMITS` is a hardcoded constant at `c:\Users\Bobits\AG-Water-Tracker\src\lib\subscription.ts` line 29, and PowerSync only syncs tables with explicit bucket definitions

**Phase relevance:** Must be addressed in the subscription tiers phase BEFORE migrating away from hardcoded limits

---

### Pitfall 2: Tightening RLS Policies Breaks PowerSync Upload for Queued Offline Writes

**What goes wrong:** The v3.0 milestone tightens permissions: well edit/delete becomes grower+admin only, allocation management becomes grower+admin only. If RLS policies are updated on Supabase (restricting who can UPDATE/DELETE wells and allocations) while a meter_checker has PENDING offline writes in their PowerSync upload queue, those queued writes will fail with RLS violations (42501) when they try to sync. The existing connector treats RLS violations as PERMANENT errors and calls `transaction.complete()` -- permanently discarding ALL operations in that transaction.

**Why it happens:** The current `isPermanentError` function in `powersync-connector.ts` (line 22) returns `true` for PostgreSQL error code `42501` (insufficient privilege). When a transaction containing multiple CRUD operations encounters one 42501 error, the ENTIRE transaction is discarded -- not just the offending operation.

**Consequences:**
- Meter checker's queued well edits (made before the policy change) are permanently lost
- If the rejected operation is in a transaction with valid readings, those readings are ALSO lost
- No UI feedback -- the user thinks their data synced successfully
- If `allocations` RLS is tightened simultaneously, any queued allocation edits from meter_checkers are also lost

**Prevention:**
- **Timing matters:** Deploy the CLIENT-SIDE permission gating (hide edit buttons for meter_checkers) FIRST, before tightening RLS policies. This ensures no new offending writes enter the queue.
- Wait 24-48 hours for all pending upload queues to drain before deploying the RLS migration
- Consider processing CRUD operations individually in the connector rather than as atomic transactions, so one rejection doesn't kill the entire batch -- but this changes error semantics and should be carefully considered
- Add a sync status indicator to the UI so users know when their queue has fully drained
- In the interim, log (don't discard) permanent errors by adding a debug table or console warning
- Alternatively, make the RLS change additive: don't DROP the permissive "Members can update wells" policy until you're confident all queues are drained. Add the restrictive policy first, then remove the permissive one in a follow-up migration.

**Detection:** Before deploying RLS changes, check if any users have pending sync operations (PowerSync dashboard metrics, or client-side `db.getNextCrudTransaction()` returns non-null).

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\src\lib\powersync-connector.ts` lines 15-33 and 82-89

**Phase relevance:** Role permissions tightening phase. Deploy client-side UI gating first, RLS changes second with a delay.

---

### Pitfall 3: Removing Registration Flow Breaks Invited User Auto-Matching

**What goes wrong:** The current invite flow works as follows: (1) Grower creates invite with phone number, (2) SMS sent, (3) invited user opens app, (4) enters phone for OTP, (5) verifies OTP, (6) `get_onboarding_status` RPC returns `has_profile: false, has_farm_membership: false`, (7) `resolveNextRoute` sends to `/onboarding/profile`, (8) user creates profile, (9) sent to `/onboarding/farm/create`, (10) farm invite auto-match happens. If the registration flow (ProfilePage, CreateFarmPage) is removed, steps 7-10 break: there is no route to create a profile, and the farm auto-matching logic lives in those removed pages.

**Why it happens:** The invite auto-matching is coupled to the onboarding flow. The `get_onboarding_status` RPC checks for profile existence and farm membership, and `RequireOnboarded` uses these to gate access. Removing the onboarding pages without replacing the auto-matching logic creates a dead end for invited users.

**Consequences:**
- Invited users complete OTP, then hit a blank page or redirect loop
- No profile gets created (the `users` table row is never inserted)
- No farm membership gets created (the auto-match that finds the invite by phone never runs)
- The user is permanently locked out of the app
- The invite shows as unused, but the invited person cannot access anything

**Prevention:**
- **Move auto-matching logic to the backend.** Create or update a Supabase trigger/RPC that runs on first successful OTP verification (or on `get_onboarding_status`):
  1. If no `users` row exists, create one using data from `auth.users` (phone number is available)
  2. Check `farm_invites` for matching `invited_phone`
  3. If match found, auto-create `farm_members` entry and populate `users` row with `invited_first_name`/`invited_last_name` from the invite
  4. Return updated onboarding status showing `has_profile: true, has_farm_membership: true`
- Update `resolveNextRoute` to handle the new "no subscription" state: authenticated user with profile but no farm membership goes to a "Contact your farm owner" page, not to farm creation
- Remove ProfilePage and CreateFarmPage routes only AFTER the server-side auto-matching is deployed and tested
- Keep `RequireOnboarded` but update it to redirect to the "no subscription" page instead of onboarding pages

**Detection:** Create a test invite, use a fresh phone number, complete OTP. If the user lands on the dashboard with correct farm data, auto-matching works. If they see an error or redirect loop, it's broken.

**Confidence:** HIGH -- directly traced through `c:\Users\Bobits\AG-Water-Tracker\src\lib\resolveNextRoute.ts` (lines 19-37) and `c:\Users\Bobits\AG-Water-Tracker\src\components\RequireOnboarded.tsx` (lines 93-102)

**Phase relevance:** Registration removal phase. Backend auto-matching must be deployed BEFORE removing onboarding pages.

---

### Pitfall 4: Onboarding Status Cache Serves Stale Data After Registration Removal

**What goes wrong:** The `AuthProvider` caches onboarding status in `localStorage` under `ag-onboarding-status`. This cache is used for instant rendering on app reload (INITIAL_SESSION handler, line 266-279). After removing registration and moving to login-only flow, the cache may contain stale states: a previously cached `{ hasProfile: false, hasFarmMembership: false }` could send a returning user to a removed route, or a cached `{ hasFarmMembership: true }` for a user whose farm membership was revoked still grants access.

**Why it happens:** The cache is only invalidated on explicit sign-out (`signOut()` calls `localStorage.removeItem`). It persists across app updates. The background refresh (line 277-279) eventually corrects it, but there's a race window where the stale cache drives routing decisions before the RPC response arrives.

**Consequences:**
- User sees a flash of removed onboarding page before being redirected
- If onboarding routes are gone, React Router hits catch-all and redirects to `/` which requires onboarding, creating a brief redirect loop
- Cached `hasFarmMembership: true` for a removed user grants momentary access to the dashboard (local PowerSync data is still available)
- The background refresh fixes this within seconds, but the flash is jarring

**Prevention:**
- When removing onboarding routes, update `resolveNextRoute` FIRST so it never returns removed paths. Instead of `/onboarding/profile`, return `/no-subscription` (the new "no farm" page). Instead of `/onboarding/farm/create`, also return `/no-subscription`.
- Consider adding an `appVersion` or `cacheVersion` field to the cache. On app update, if version doesn't match, invalidate cache and show loading spinner while fresh RPC completes.
- The `RequireOnboarded` component's retry UI (lines 50-85) already handles the case where onboarding status is null with a session present -- this is the correct fallback behavior.
- Remove the `ONBOARDING_CACHE_KEY` mechanism entirely if the login-only flow makes it unnecessary (since all users must have a profile and farm membership to exist in the system).

**Detection:** Clear app data, login, verify onboarding cache is not stale. Then force-kill the app, reopen offline -- verify cached state doesn't route to removed pages.

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\src\lib\AuthProvider.tsx` lines 20, 264-279

**Phase relevance:** Registration removal phase. Update resolveNextRoute before removing routes.

---

### Pitfall 5: Allocations RLS is Wide Open -- Any Farm Member Can CRUD

**What goes wrong:** Migration 031 set ALL allocations policies to `get_user_farm_ids()` (any farm member), not `get_user_admin_farm_ids()` (grower/admin only). The v3.0 requirements say "Allocation management gated to grower and admin only." This means the current database allows meter_checkers to create, update, and delete allocations. If you only add client-side gating (hide buttons) without fixing RLS, any user who knows the Supabase API or uses browser dev tools can manipulate allocations.

**Why it happens:** Migration 031 explicitly decided "anyone with well access can set allocations" (comment on line 191). This was a v2.0 decision that v3.0 now reverses. The migration comment says this was intentional, but the v3.0 requirements override it.

**Consequences:**
- Meter checkers can modify allocations through direct API calls even if UI buttons are hidden
- Allocation data integrity is compromised
- Audit trail unreliable if unauthorized users can modify allocations

**Prevention:**
- Create a new migration that replaces the four allocations RLS policies:
  - `Members can create allocations` -> `Growers and admins can create allocations` using `get_user_admin_farm_ids()`
  - `Members can update allocations` -> `Growers and admins can update allocations` using `get_user_admin_farm_ids()`
  - `Members can delete allocations` -> `Growers and admins can delete allocations` using `get_user_admin_farm_ids()`
  - Keep `Members can view farm allocations` as-is (all members should still see allocations)
- Apply the same timing strategy as Pitfall 2: deploy client-side UI gating first, wait for queues to drain, then deploy RLS changes
- Similarly, migration 032 relaxed wells UPDATE/DELETE to `get_user_farm_ids()` -- v3.0 needs to tighten this back to `get_user_admin_farm_ids()`

**Detection:** Log in as a meter_checker, attempt `supabase.from('allocations').insert(...)` directly. If it succeeds, RLS is too permissive.

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\031_create_readings_and_allocations.sql` lines 193-208 and `032_well_edit_allocation_schema.sql` lines 35-41

**Phase relevance:** Role permissions phase. Must tighten RLS to match the permission matrix in `src/lib/permissions.ts`.

---

### Pitfall 6: Wells UPDATE/DELETE RLS Also Wide Open -- Same Problem as Allocations

**What goes wrong:** Migration 032 relaxed wells UPDATE and DELETE from `get_user_admin_farm_ids()` to `get_user_farm_ids()`, meaning ANY farm member (including meter_checkers) can edit and delete wells at the database level. The v3.0 requirements say "Well edit/delete gated to grower and admin only." The client-side permission matrix in `permissions.ts` already restricts `manage_wells` to grower, admin, and super_admin -- but the database doesn't enforce this.

**Why it happens:** Same as Pitfall 5 -- a v2.0 decision that v3.0 reverses.

**Consequences:**
- Meter checkers can delete wells through direct API calls
- Well deletion cascades to all readings and allocations for that well (ON DELETE CASCADE)
- A single unauthorized delete could destroy months of reading data

**Prevention:**
- Create migration to restore `get_user_admin_farm_ids()` for wells UPDATE and DELETE policies
- Keep INSERT as `get_user_admin_farm_ids()` (already correct from migration 011, though migration 018 may have relaxed it -- verify)
- Apply same timing strategy as Pitfall 2

**Detection:** Log in as a meter_checker, attempt `supabase.from('wells').delete().eq('id', wellId)`. If it succeeds, RLS is too permissive.

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\032_well_edit_allocation_schema.sql` lines 35-41

**Phase relevance:** Role permissions phase. Tighten alongside allocations in same migration.

---

### Pitfall 7: Super Admin Cross-Farm Bypass Inconsistent Across RLS, Sync Rules, and UI

**What goes wrong:** The `get_user_admin_farm_ids()` function returns farm IDs where the user's role is `super_admin`, `grower`, or `admin`. For super_admins, this only returns farms they are explicitly members of. If a super_admin needs to access ALL farms (the existing `useActiveFarm` hook supports a farm override), the RLS helper functions don't account for this -- they only check `farm_members` rows. The PowerSync sync rules similarly only sync data for farms where the user has a `farm_members` entry.

**Why it happens:** The super_admin cross-farm pattern relies on migration 025 (`auto_add_super_admin_to_farms`) which automatically adds super_admins to every farm. If this trigger works correctly, the RLS functions naturally include all farms. But if a new farm is created and the trigger fails (e.g., due to a search_path issue like those documented in MEMORY.md), the super_admin loses access to that farm.

**Consequences:**
- Super admin cannot see a newly created farm if the auto-add trigger failed
- Super admin's PowerSync client doesn't sync data for the missed farm
- The `useActiveFarm` override shows the farm name but no data loads (empty wells list, no readings)
- No error -- just silently empty data

**Prevention:**
- Verify the auto-add trigger from migration 025 uses fully qualified table references (`public.farm_members`, `public.farms`) -- the MEMORY.md documents this exact class of bug
- Add a health check: `get_onboarding_status` or a new RPC should verify super_admin has memberships for all farms, and alert if any are missing
- Consider an alternative pattern: instead of relying on trigger-based auto-membership, add a `WHERE role = 'super_admin'` clause to `get_user_farm_ids()` that returns ALL farm IDs when the user is a super_admin in ANY farm:
  ```sql
  SELECT farm_id FROM farm_members WHERE user_id = auth.uid()
  UNION
  SELECT id FROM farms WHERE EXISTS (
    SELECT 1 FROM farm_members WHERE user_id = auth.uid() AND role = 'super_admin'
  )
  ```
- This is a defensive approach that doesn't rely on the trigger being perfect

**Detection:** Create a new farm as a grower. Verify the super_admin can see it within 30 seconds. If not, check `farm_members` for the super_admin's entry.

**Confidence:** MEDIUM -- the trigger may work correctly, but the documented search_path issues (MEMORY.md) suggest this is fragile

**Phase relevance:** Farm data isolation audit phase. Verify trigger and consider defensive RLS approach.

---

## Moderate Pitfalls

Mistakes that cause degraded UX, security gaps that are exploitable but not catastrophic, or significant rework.

---

### Pitfall 8: farms Table Missing subscription_tier Column Breaks Existing Queries

**What goes wrong:** Adding `farms.subscription_tier` requires a Supabase migration AND updating the PowerSync schema. If the PowerSync schema in `powersync-schema.ts` doesn't include the new column, it won't be synced to the client. If the `farms` table definition in the sync rules doesn't SELECT the new column, it's NULL locally even if it has a value in Postgres.

**Why it happens:** The existing sync rule for farms (line 26 in `powersync-sync-rules.yaml`) explicitly lists columns: `SELECT id, name, street_address, city, state, zip_code, created_at, updated_at FROM farms`. Adding a column to the Postgres table does NOT automatically add it to the sync. Three updates are required.

**Consequences:**
- `subscription_tier` is always null on the client
- Subscription page shows wrong tier or crashes
- Seat limit checks use default/fallback values
- Well limit checks don't work

**Prevention:**
- Checklist for the `subscription_tier` column:
  1. Supabase migration: `ALTER TABLE farms ADD COLUMN subscription_tier TEXT DEFAULT 'basic'`
  2. PowerSync sync rules: add `subscription_tier` to the farms SELECT
  3. `powersync-schema.ts`: add `subscription_tier: column.text` to the farms table
  4. NOT in `ALLOWED_TABLES` for writes (tier changes come from the admin/Stripe, not client)
- Use a NOT NULL DEFAULT so existing farms get a tier automatically
- The `useSubscriptionTier` hook should handle null gracefully (fallback to basic)

**Detection:** After migration, query `SELECT subscription_tier FROM farms` locally on client. If null, sync rules weren't updated.

**Confidence:** HIGH -- directly observed the explicit column list pattern in sync rules at `c:\Users\Bobits\AG-Water-Tracker\docs\powersync-sync-rules.yaml` line 26

**Phase relevance:** Subscription tiers phase. Must coordinate DB migration, sync rules, and client schema.

---

### Pitfall 9: Seat Limit Enforcement Has No Server-Side Check

**What goes wrong:** The current `useSeatUsage` hook enforces seat limits purely client-side. When subscription tiers move to a DB table, the seat limits will be read from the synced tier data. But the invite RPCs (`invite_user_by_phone_impl`, `create_invite_code_impl`) have NO seat limit checks. A user with a modified client or direct API access can create unlimited invites regardless of tier.

**Why it happens:** The v1.0 subscription gating was explicitly "UI only" (PROJECT.md line 35). The RPCs validate role permissions but not seat counts.

**Consequences:**
- Farms can exceed their seat limits through direct API calls
- The UI shows "seats full" but the backend happily accepts more
- Revenue leakage if tiers are monetized (farms get Pro features on Basic plan)

**Prevention:**
- Add seat limit checks to the `invite_user_by_phone_impl` RPC:
  1. Look up the farm's `subscription_tier`
  2. Join to `subscription_tiers` to get the limit for the requested role
  3. Count existing `farm_members` + pending `farm_invites` for that role
  4. RAISE EXCEPTION if count >= limit
- Add well limit checks to the wells INSERT RLS or a new `create_well` RPC:
  1. Look up the farm's tier
  2. Count existing wells for the farm
  3. Block if at limit
- Client-side enforcement remains for UX (show "upgrade" message before attempting), server-side is the actual gate

**Detection:** Use `curl` or Supabase client directly to call `invite_user_by_phone` when seats are supposedly full. If it succeeds, server enforcement is missing.

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\021_four_role_system.sql` lines 245-351 (no seat check)

**Phase relevance:** Subscription tiers phase. Add server-side checks to RPCs.

---

### Pitfall 10: get_onboarding_status RPC Needs Major Rework for Login-Only Flow

**What goes wrong:** The current `get_onboarding_status` RPC (migration 010) returns `has_profile` and `has_farm_membership` to drive the onboarding wizard. In the login-only flow, every authenticated user should either have both (invited and auto-matched) or neither (not invited -- show "no subscription" page). The RPC's intermediate states (`has_profile: true, has_farm_membership: false`) are artifacts of the removed self-registration flow. If the RPC isn't updated, `RequireOnboarded` will try to redirect to the removed farm creation page.

**Why it happens:** The RPC was designed for a multi-step onboarding wizard. The login-only flow collapses this to a binary: you're in or you're not.

**Consequences:**
- Users in intermediate state (profile but no farm) are redirected to removed routes
- `resolveNextRoute` returns paths that don't exist anymore
- The app shows the retry UI or a blank screen

**Prevention:**
- Either update the RPC to also perform auto-matching (check for pending invite, create membership if found) so it never returns intermediate states, OR
- Simplify the RPC to return a single boolean `is_active_member` plus `farm_id` and `farm_name`
- Update `OnboardingStatus` type, `resolveNextRoute`, `RequireOnboarded`, and all consumers
- The `RequireOnboarded` component should redirect non-members to `/no-subscription`, not to onboarding routes

**Detection:** Create an auth.users entry with no users table row and no farm_members row. Call `get_onboarding_status`. If it returns `has_profile: false, has_farm_membership: false`, verify that the app handles this without trying to route to removed pages.

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\010_auth_rpcs.sql` lines 311-353

**Phase relevance:** Registration removal phase. Update RPC before removing routes.

---

### Pitfall 11: Removing Onboarding Code Leaves Orphaned Imports and Dead Guards

**What goes wrong:** The onboarding flow is deeply integrated:
- `App.tsx`: imports ProfilePage, CreateFarmPage, RequireNotOnboarded (lines 12-13, 43-47)
- `resolveNextRoute.ts`: returns `/onboarding/profile` and `/onboarding/farm/create` (lines 26, 31)
- `AuthProvider.tsx`: `ONBOARDING_CACHE_KEY`, `OnboardingStatus` type with `hasProfile`/`hasFarmMembership`
- `RequireNotOnboarded.tsx`: entire component exists only for onboarding guard
- `RequireOnboarded.tsx`: redirects to onboarding routes (lines 93-102)

If removal is done piecemeal (delete pages but forget imports, or remove routes but keep resolveNextRoute references), TypeScript compilation will break or runtime errors will occur.

**Why it happens:** The onboarding code touches auth, routing, guards, and pages -- a cross-cutting concern. Partial removal is easy to botch.

**Consequences:**
- TypeScript compile errors if imports reference deleted files
- Runtime errors if `resolveNextRoute` returns a path with no matching route
- `RequireNotOnboarded` component becomes dead code that still gets bundled
- Stale `OnboardingStatus` type with fields that no longer make sense

**Prevention:**
- Create a removal checklist:
  1. Update `resolveNextRoute.ts` to never return onboarding paths
  2. Update `RequireOnboarded.tsx` to redirect to `/no-subscription` instead of onboarding routes
  3. Remove `RequireNotOnboarded.tsx` entirely
  4. Remove `ProfilePage.tsx` and `CreateFarmPage.tsx`
  5. Remove onboarding routes from `App.tsx`
  6. Remove `RequireNotOnboarded` import from `App.tsx`
  7. Remove ProfilePage and CreateFarmPage imports from `App.tsx`
  8. Simplify `OnboardingStatus` type (or replace with `MembershipStatus`)
  9. Clean up `ONBOARDING_CACHE_KEY` if no longer needed
  10. Remove `isOnboardingRoute` and `isOnboardingComplete` helpers
- Run `npx tsc -b --noEmit` after EVERY deletion to catch missed references
- Run `npx vite build` to verify no runtime import failures

**Detection:** `npx tsc -b --noEmit` should report zero errors after cleanup.

**Confidence:** HIGH -- directly traced all cross-references in the codebase

**Phase relevance:** Registration removal phase. Use the checklist, verify with TypeScript compiler after each step.

---

### Pitfall 12: Permission Matrix vs. RLS Policy Mismatch Creates Confusion

**What goes wrong:** The client-side `PERMISSION_MATRIX` in `permissions.ts` defines what each role CAN do. The Supabase RLS policies define what each role is ALLOWED to do at the database level. These two systems can drift apart. Currently, `permissions.ts` says `manage_wells` is only for super_admin, grower, and admin. But RLS allows ANY farm member to update and delete wells (migration 032). The v3.0 milestone is specifically about aligning these.

**Why it happens:** Client-side permissions were designed for UI gating (show/hide buttons). RLS was designed for data security. They evolved independently across milestones.

**Consequences:**
- A meter_checker can't see the "Edit Well" button (client permission check) but CAN edit a well through direct API/PowerSync (RLS allows it)
- Developers may assume client-side gating is sufficient and skip RLS tightening
- Future developers may look at `permissions.ts` and assume RLS matches, creating false security confidence

**Prevention:**
- Create a verification matrix:
  | Action | permissions.ts | RLS (wells) | RLS (allocations) | RLS (readings) |
  |--------|---------------|-------------|-------------------|----------------|
  | Create | grower+admin+sa | admin farm ids | any member | any member |
  | Update | grower+admin+sa | any member | any member | admin farm ids |
  | Delete | grower+admin+sa | any member | any member | admin farm ids |
- After tightening RLS, verify every cell matches
- Add a comment at the top of `permissions.ts` noting the RLS dependency
- Consider adding actions for specific operations: `edit_well`, `delete_well`, `manage_allocations` -- more granular than `manage_wells`

**Detection:** For each action in `PERMISSION_MATRIX`, attempt the corresponding database operation as each role. Compare results with the permission matrix.

**Confidence:** HIGH -- directly observed mismatch between `permissions.ts` and migrations 031/032

**Phase relevance:** Role permissions phase. Align RLS with permission matrix systematically.

---

### Pitfall 13: "No Subscription" Page Must Work Without PowerSync

**What goes wrong:** When a user authenticates but has no farm membership (not invited, or invite expired), they should see a "No Subscription" page. This page is outside the `RequireOnboarded` guard, which means it's also outside the `AppLayout` which wraps `PowerSyncProvider`. If the page tries to use any PowerSync hooks (`useQuery`, `useUserRole`, etc.), it will crash with "usePowerSync must be used within PowerSyncProvider."

**Why it happens:** `AppLayout.tsx` contains the `PowerSyncProvider`. Routes inside `AppLayout` have PowerSync available. The "no subscription" route must be OUTSIDE the onboarded guard but still INSIDE `RequireAuth`. The PowerSync provider hierarchy doesn't extend to this route.

**Consequences:**
- Page crashes on render
- User sees a white screen or error boundary instead of the helpful redirect page
- No way for the user to know what went wrong or what to do next

**Prevention:**
- The "no subscription" page must use ZERO PowerSync hooks
- It should only use `useAuth()` (which is above AppLayout) to get user info
- Display: "Your account is not associated with a farm. Contact your farm administrator or visit [subscription website URL]."
- The subscription website URL could be hardcoded or stored in a non-PowerSync way (env var or fetched via Supabase RPC)
- Consider if `app_settings` URL should be fetched directly via Supabase client (online-only is fine for this page, since the user needs to be online to do anything about their subscription anyway)

**Detection:** Navigate to the "no subscription" route. If it renders without crashes, it's safe.

**Confidence:** HIGH -- PowerSyncProvider location directly observed in `c:\Users\Bobits\AG-Water-Tracker\src\App.tsx` line 54 (AppLayout wraps protected routes)

**Phase relevance:** Registration removal phase. Design the "no subscription" page to be PowerSync-independent.

---

### Pitfall 14: Well Limit Enforcement Not in Permission Matrix or UI

**What goes wrong:** The v3.0 requirements include "Well limits enforced per tier (Basic: 5, Pro: 10)." The current `PERMISSION_MATRIX` has `create_well` and `manage_wells` actions but no concept of "can create IF under limit." The permission check `hasPermission(role, 'create_well')` returns true/false based on role, not on tier limits. A separate well count check is needed, and it must be enforced both client-side (disable "New Well" button when at limit) and server-side (RLS or RPC).

**Why it happens:** Permission systems typically model role-based access (who can do what), not quota-based access (how many times). These are orthogonal concerns.

**Consequences:**
- If only client-side: limit bypassed via direct API
- If only server-side: confusing UX (user clicks "New Well", gets cryptic RLS error)
- If neither: limits not enforced at all

**Prevention:**
- Create a `useWellLimit` hook: reads tier from synced `subscription_tiers`, counts current wells from PowerSync, returns `{ current, limit, canCreate }`
- Disable "New Well" button when `!canCreate`, show "Upgrade to add more wells"
- Server-side: either a CHECK trigger on wells INSERT that counts existing wells for the farm and compares to tier limit, or a `create_well` RPC that does the check before inserting
- Do NOT rely solely on RLS for this -- RLS can't easily encode "INSERT only if COUNT < N"

**Detection:** Create wells up to the limit, attempt one more. Client should show "upgrade" message. Direct API call should fail with clear error.

**Confidence:** HIGH -- quota enforcement is fundamentally different from role-based access

**Phase relevance:** Subscription tiers phase. Implement as a separate concern from role permissions.

---

## Minor Pitfalls

---

### Pitfall 15: PowerSync INTEGER Boolean Still Needed for subscription_tiers

**What goes wrong:** If `subscription_tiers` includes boolean columns (e.g., `has_reporting`, `has_export`), they must use `column.integer` in the PowerSync schema and be converted to actual booleans in consuming code. The project memory (MEMORY.md) documents this, but new developers adding tier feature flags may use `column.text` and compare against `"true"` string.

**Prevention:** Follow existing pattern: use `column.integer`, convert with `Boolean()` or `!!value` in hooks. Document in the table definition.

**Confidence:** HIGH -- documented in MEMORY.md and CLAUDE.md

**Phase relevance:** Subscription tiers phase.

---

### Pitfall 16: Hardcoded Plan Names in UI Components

**What goes wrong:** `SubscriptionPage.tsx` currently references `PLAN_LIMITS.name` (hardcoded "Basic"). Other components may reference plan names as string literals. When switching to DB-driven tiers, these hardcoded references become stale.

**Prevention:** After creating the `useSubscriptionTier` hook, grep for `PLAN_LIMITS`, `'Basic'`, `'Pro'`, `'basic'`, `'pro'` across all files. Replace with hook-provided values.

**Confidence:** HIGH -- directly observed in `c:\Users\Bobits\AG-Water-Tracker\src\pages\SubscriptionPage.tsx` line 17

**Phase relevance:** Subscription tiers phase. Clean up after migrating to DB-driven tiers.

---

### Pitfall 17: farm_invites CHECK Constraint Only Allows admin and meter_checker Roles

**What goes wrong:** Migration 021 added `CHECK (role IN ('admin', 'meter_checker'))` on `farm_invites`. If subscription tiers introduce new role types or if the grower role needs to be invitable (e.g., transferring farm ownership), the CHECK constraint blocks it silently at the database level.

**Prevention:** This is fine for v3.0 (grower accounts are not created via invite). But document the constraint location so future developers know where to update if invite roles expand.

**Confidence:** MEDIUM -- not a v3.0 issue but worth noting for future awareness

**Phase relevance:** N/A for v3.0, but note in documentation.

---

### Pitfall 18: Disabled Users Can Still Sync via PowerSync

**What goes wrong:** The user management system supports disabling users (soft delete). But PowerSync sync rules filter by `farm_members` existence, not by a `disabled` flag. A disabled user's local SQLite still receives data updates, and their queued writes still sync.

**Prevention:** Verify how disabled users are represented. If disabling removes the `farm_members` row, PowerSync sync naturally stops (no bucket match). If disabling sets a flag on `farm_members`, the sync rules need a `WHERE disabled = false` filter. Check migration 029/030 (drop disable feature) -- this may already be resolved.

**Confidence:** MEDIUM -- depends on current disable implementation

**Phase relevance:** Farm data isolation audit phase. Verify during RLS/sync audit.

---

### Pitfall 19: app_settings Table Global Sync Bucket Pattern Not Documented

**What goes wrong:** The `app_settings` table (subscription website URL, global config) is not farm-scoped. The existing PowerSync sync rules all use farm-based bucket parameters. A global config table needs a different bucket pattern -- either a "global" bucket with no parameters, or a user-scoped bucket that syncs the same data to everyone.

**Prevention:** Use a simple bucket definition:
```yaml
global_settings:
  parameters: SELECT request.user_id() as user_id
  data:
    - SELECT id, key, value FROM app_settings
```
This syncs all settings to all authenticated users. The table should be small (handful of rows) so there's no performance concern.

**Confidence:** HIGH -- PowerSync sync rules require explicit bucket definitions, and the current codebase has no example of a non-farm-scoped bucket except `user_profile`

**Phase relevance:** Subscription tiers phase. Add global bucket when creating sync rules.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Subscription tier DB tables | Config not synced offline (Pitfall 1) | Add to PowerSync sync rules as global bucket, client schema, with hardcoded fallback |
| Subscription tier DB tables | No server-side seat enforcement (Pitfall 9) | Add limit checks to invite and well creation RPCs |
| Subscription tier DB tables | Well limit not in permission model (Pitfall 14) | Separate `useWellLimit` hook + server-side trigger/RPC |
| farms.subscription_tier column | Not in sync rules (Pitfall 8) | Update sync rules SELECT, client schema, migration -- all three |
| Role permission tightening | RLS breaks queued offline writes (Pitfall 2) | Deploy client UI gating first, wait 24-48h, then tighten RLS |
| Role permission tightening | Allocations RLS too permissive (Pitfall 5) | Migrate from `get_user_farm_ids` to `get_user_admin_farm_ids` for CUD |
| Role permission tightening | Wells RLS too permissive (Pitfall 6) | Same migration, same timing strategy |
| Role permission tightening | Permission matrix vs RLS mismatch (Pitfall 12) | Create verification matrix, test each role x action |
| Registration removal | Invite auto-matching breaks (Pitfall 3) | Move auto-matching to server-side RPC, deploy BEFORE removing pages |
| Registration removal | Stale onboarding cache (Pitfall 4) | Update resolveNextRoute first, consider cache versioning |
| Registration removal | get_onboarding_status intermediate states (Pitfall 10) | Simplify RPC for login-only flow |
| Registration removal | Orphaned imports and dead code (Pitfall 11) | Use removal checklist, verify with tsc after each step |
| Registration removal | No-subscription page crashes without PowerSync (Pitfall 13) | Design page to use zero PowerSync hooks |
| Farm data isolation audit | Super admin bypass inconsistent (Pitfall 7) | Verify auto-add trigger, consider defensive RLS pattern |
| Farm data isolation audit | Disabled users still sync (Pitfall 18) | Verify disable mechanism and sync rule filtering |

---

## Sources

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- nested subquery performance, policy design patterns (HIGH confidence)
- [Supabase RLS Complete Guide 2026](https://designrevision.com/blog/supabase-row-level-security) -- multi-tenant data isolation patterns (MEDIUM confidence)
- [Supabase Multi-Tenant RLS Patterns](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- tenant isolation, defense-in-depth (MEDIUM confidence)
- [PowerSync Sync Rules Documentation](https://docs.powersync.com/usage/sync-rules) -- bucket definitions, parameter queries, data queries (HIGH confidence)
- [PowerSync RLS and Sync Rules](https://docs.powersync.com/integration-guides/supabase-+-powersync/rls-and-sync-rules) -- relationship between Supabase RLS and PowerSync sync (HIGH confidence)
- [PowerSync Client Architecture](https://docs.powersync.com/architecture/client-architecture) -- offline write queue, upload behavior (HIGH confidence)
- [PowerSync Philosophy](https://docs.powersync.com/overview/powersync-philosophy) -- writes validated server-side, client-server transaction limitations (HIGH confidence)
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\lib\powersync-connector.ts` -- ALLOWED_TABLES, isPermanentError, transaction.complete() discard behavior
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\lib\subscription.ts` -- hardcoded PLAN_LIMITS constant
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\lib\permissions.ts` -- PERMISSION_MATRIX, role definitions
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\lib\AuthProvider.tsx` -- onboarding cache, session lifecycle
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\lib\resolveNextRoute.ts` -- route resolution logic
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\components\RequireOnboarded.tsx` -- onboarding guard with redirect to removed routes
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\components\RequireNotOnboarded.tsx` -- dead code after registration removal
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\App.tsx` -- route structure, PowerSync provider location
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\hooks\useSeatUsage.ts` -- client-side seat enforcement
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\src\hooks\useActiveFarm.ts` -- super admin farm override
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\010_auth_rpcs.sql` -- get_onboarding_status, invite RPCs
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\011_new_rls_policies.sql` -- RLS helper functions, policy structure
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\021_four_role_system.sql` -- invite RPCs without seat checks
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\031_create_readings_and_allocations.sql` -- permissive allocation RLS
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\supabase\migrations\032_well_edit_allocation_schema.sql` -- permissive well update/delete RLS
- Codebase: `c:\Users\Bobits\AG-Water-Tracker\docs\powersync-sync-rules.yaml` -- explicit column lists in sync rules
- Project memory: MEMORY.md -- search_path cascade bug, PowerSync BOOLEAN limitation

---
*Pitfalls research for: AG Water Tracker -- Subscription Tiers, Role Permissions, Login-Only Flow, Farm Data Isolation*
*Researched: 2026-02-22*
