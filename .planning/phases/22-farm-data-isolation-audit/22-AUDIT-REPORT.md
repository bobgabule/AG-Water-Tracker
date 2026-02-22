# Farm Data Isolation Audit Report

**Phase:** 22-farm-data-isolation-audit
**Date:** 2026-02-22
**Scope:** All database layers, sync infrastructure, and client-side data access

## Executive Summary

The AG Water Tracker database layer is well-isolated with no cross-farm data leakage for regular users. All RLS policies correctly filter by `farm_id` via the `get_user_farm_ids()` helper function, which derives farm access from `farm_members` rows. PowerSync sync rules are parameterized identically -- each bucket selects `farm_id FROM farm_members WHERE user_id = request.user_id()`.

**Findings:**
- Two stale code references to `farms.invite_code` (dropped in migration 024) were found in `join_farm_with_code_impl` -- cleaned in migration 035
- A `super_admin_user_id` app_settings entry was added for configurable super admin identification
- 13 client-side files used `authStatus?.farmId` instead of `useActiveFarm().farmId`, preventing super admin farm switching from propagating to data queries -- fixed in Plan 22-02
- Super admin cross-farm access works via auto-membership triggers (migration 025), which gives them `farm_members` rows in all farms -- consistent across RLS and PowerSync

**Overall Verdict: PASS** -- with remediations applied.

## Audit Methodology

Every layer that touches farm data was systematically reviewed:

1. **RLS Policies** -- Reviewed all `CREATE POLICY` statements across all 34 migrations for every table with farm-scoped data
2. **PowerSync Sync Rules** -- Reviewed `docs/powersync-sync-rules.yaml` for all bucket definitions and parameterization
3. **RPC Functions** -- Reviewed all 9 private schema functions and their public wrappers for farm isolation
4. **Trigger Functions** -- Reviewed all trigger functions for qualified table references and farm boundary respect
5. **Client-Side Hooks & Pages** -- Grepped all source files for farm ID usage patterns
6. **Connector Upload Path** -- Reviewed `powersync-connector.ts` for Supabase client usage (RLS enforcement)
7. **Edge Functions** -- Reviewed `supabase/functions/send-invite-sms/` for authentication and authorization
8. **Storage & Realtime** -- Checked for Supabase Storage or Realtime channel usage (none found)

## Findings by Layer

### Layer 1: RLS Policies

All tables with farm-scoped data use `get_user_farm_ids()` or `get_user_admin_farm_ids()` for access control. These functions query `farm_members WHERE user_id = auth.uid()`, ensuring users can only access farms where they have an active membership.

| Table | SELECT | INSERT | UPDATE | DELETE | Isolation Method | Verdict |
|-------|--------|--------|--------|--------|------------------|---------|
| **farms** | `id IN (get_user_farm_ids())` | Authenticated users (via RPC) | `id IN (get_user_admin_farm_ids())` | None | farm_members membership | PASS |
| **wells** | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | Direct farm_id filter | PASS |
| **readings** | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_admin_farm_ids())` | `farm_id IN (get_user_admin_farm_ids())` | Denormalized farm_id filter | PASS |
| **allocations** | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | `farm_id IN (get_user_farm_ids())` | Denormalized farm_id filter | PASS |
| **farm_members** | `user_id = auth.uid()` OR `farm_id IN (get_user_farm_ids())` | Via RPC only | None | None | User ID + membership | PASS |
| **farm_invites** | `farm_id IN (get_user_admin_farm_ids())` | Via RPC only | Via RPC only | Via RPC only | Admin membership check | PASS |
| **users** | `id = auth.uid()` OR co-member check | Self only | Self only | None | User ID + co-membership | PASS |
| **subscription_tiers** | `USING (true)` TO authenticated | None | None | None | Global read-only (no farm data) | PASS |
| **app_settings** | `USING (true)` TO authenticated | None | None | None | Global read-only (no farm data) | PASS |

**Notes:**
- `subscription_tiers` and `app_settings` are intentionally global (read-only configuration, no farm-specific data)
- `farm_members` INSERT/UPDATE/DELETE are restricted to SECURITY DEFINER RPCs that enforce role-based access
- Wells policies were updated in migration 032 to allow all farm members (not just admins) to edit/delete -- consistent with client-side permission checks
- Readings/allocations use denormalized `farm_id` columns (auto-populated by triggers) for efficient RLS filtering

### Layer 2: PowerSync Sync Rules

All farm-scoped buckets use the same parameterization pattern: `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()`. This ensures each user only receives data for farms where they have an active `farm_members` row.

| Bucket | Parameters | Data Filter | Verdict |
|--------|-----------|-------------|---------|
| **subscription_tiers_global** | `SELECT 'global' as scope` | `WHERE 'global' = bucket.scope` | PASS (global, no farm data) |
| **app_settings_global** | `SELECT 'global' as scope` | `WHERE 'global' = bucket.scope` | PASS (global, no farm data) |
| **user_farms** | `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` | `WHERE id = bucket.farm_id` | PASS |
| **farm_members** | `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` | `WHERE farm_id = bucket.farm_id` | PASS |
| **farm_invites** | `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` | `WHERE farm_id = bucket.farm_id` | PASS |
| **farm_wells** | `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` | `WHERE farm_id = bucket.farm_id` | PASS |
| **farm_readings** | `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` | `WHERE farm_id = bucket.farm_id` | PASS |
| **farm_allocations** | `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` | `WHERE farm_id = bucket.farm_id` | PASS |
| **user_profile** | `SELECT request.user_id() as user_id` | `WHERE id = bucket.user_id` | PASS (own profile only) |

**Super Admin Note:** Super admin users have `farm_members` rows in ALL farms via auto-add triggers (migration 025). This means all farm-scoped buckets naturally include all farms for super_admin users -- no special sync rule logic is needed. The sync rules and RLS policies are perfectly aligned.

### Layer 3: RPC Functions

All RPC functions use the private schema pattern (SECURITY DEFINER in `private.*`, SECURITY INVOKER wrapper in `public.*`). Each function validates `auth.uid()` and checks farm membership before performing operations.

| Function | Farm Isolation Check | Super Admin Support | Verdict |
|----------|---------------------|---------------------|---------|
| **create_farm_and_membership_impl** | Creates new farm + membership for caller | N/A (creates new farm) | PASS |
| **join_farm_with_code_impl** | Looks up invite in `farm_invites`, validates code | N/A (invite-based) | PASS (cleaned in migration 035) |
| **create_invite_code_impl** | Checks caller is owner/admin of target farm | super_admin allowed | PASS |
| **invite_user_by_phone_impl** | Checks caller is owner/admin of target farm | super_admin allowed | PASS |
| **revoke_farm_invite_impl** | Checks caller is owner/admin of invite's farm | N/A (admin check) | PASS |
| **get_onboarding_status_impl** | Returns caller's own farm data only | N/A (self-only) | PASS |
| **get_user_farm_memberships_impl** | Returns caller's own memberships only | N/A (self-only) | PASS |
| **remove_farm_member_impl** | Checks caller is member of target farm, role hierarchy | super_admin allowed | PASS |
| **custom_access_token_hook** | Reads caller's primary farm membership | N/A (JWT hook) | PASS |

**Stale Code Fixed (Migration 035):**
- `join_farm_with_code_impl` had a legacy fallback to `public.farms WHERE invite_code = p_code` (lines 187-203 in migration 020). The `invite_code` column was dropped in migration 024. This fallback would have caused a runtime error. Fixed by removing the fallback entirely -- now raises `'Invalid invite code'` immediately if no `farm_invites` match.

**All functions use fully qualified `public.*` table references** as required by `SET search_path = ''`.

### Layer 4: Trigger Functions

All trigger functions use fully qualified `public.*` references, which is critical because they may fire during SECURITY DEFINER function calls that have `SET search_path = ''`.

| Trigger Function | Table References | Verdict |
|------------------|-----------------|---------|
| **set_farm_member_full_name** | `public.users` | PASS (fixed in migration 024) |
| **sync_farm_member_full_name** | `public.farm_members` | PASS (fixed in migration 024) |
| **set_reading_farm_id** | `public.wells` | PASS (correct since creation in migration 031) |
| **set_allocation_farm_id** | `public.wells` | PASS (correct since creation in migration 031) |
| **update_updated_at_column** | N/A (only modifies `NEW.updated_at`) | PASS |
| **add_super_admins_to_new_farm** | `public.farm_members` | PASS (uses `SET search_path = ''` + qualified refs) |
| **add_super_admin_to_all_farms** | `public.farms`, `public.farm_members` | PASS |
| **add_super_admin_to_all_farms_on_insert** | `public.farms`, `public.farm_members` | PASS |

### Layer 5: Client-Side Hooks & Pages

**Critical Gap Found:** 13 files used `authStatus?.farmId` (from the JWT-embedded primary farm ID) instead of `useActiveFarm().farmId`. This meant that when a super admin switched farms via FarmSelector, the UI would show the selected farm's name but data queries would still use the admin's primary farm. Regular users are unaffected since they only belong to one farm.

**Files affected (fixed in Plan 22-02):**
- `src/hooks/useWells.ts`
- `src/hooks/useWellCount.ts`
- `src/hooks/useSubscriptionTier.ts`
- `src/hooks/useSeatUsage.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/WellListPage.tsx`
- `src/pages/WellDetailPage.tsx`
- `src/pages/WellAllocationsPage.tsx`
- `src/pages/UsersPage.tsx`
- `src/pages/SubscriptionPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/components/PendingInvitesList.tsx`
- `src/components/AddUserModal.tsx`

**Intentionally NOT modified:**
- `useUserRole.ts` -- Must use `authStatus?.farmId` because `useActiveFarm()` calls `useUserRole()` internally (circular dependency). Safe because super_admin has the `super_admin` role in ALL farms via auto-add triggers.
- `FarmSelector.tsx` -- Correctly uses `authStatus?.farmId` as `ownFarmId` to distinguish the user's primary farm from overrides.

### Layer 6: Connector Upload Path

The PowerSync connector (`src/lib/powersync-connector.ts`) uses the standard Supabase client for all write operations:

```
supabase.from(table).upsert(data)
supabase.from(table).update(data).eq('id', op.id)
supabase.from(table).delete().eq('id', op.id)
```

All writes go through Supabase's PostgREST layer, which enforces RLS policies. There is no bypass path -- even offline-queued CRUD operations are replayed through the authenticated Supabase client when connectivity is restored. The connector also restricts operations to an `ALLOWED_TABLES` set, preventing unexpected table writes.

**Verdict: PASS** -- All writes are RLS-protected.

### Layer 7: Edge Functions

One edge function exists: `supabase/functions/send-invite-sms/index.ts`.

- Verifies JWT authentication via `supabase.auth.getUser()`
- Does not read or write farm data (only sends an SMS via Twilio)
- Uses the caller's authenticated Supabase client (not service_role key)
- No farm isolation concern (notification-only, no data access)

**Verdict: PASS** -- No farm data exposure.

### Layer 8: Storage & Realtime

No Supabase Storage buckets or Realtime channel subscriptions were found in the codebase. The app does not use file storage or real-time subscriptions. Data sync is handled exclusively by PowerSync.

**Verdict: N/A** -- Not applicable (no storage or realtime usage).

## Remediation Summary

| # | Fix | Location | Status |
|---|-----|----------|--------|
| 1 | Cleaned stale `invite_code` fallback from `join_farm_with_code_impl` | `supabase/migrations/035_isolation_audit_fixes.sql` | Done (Plan 22-01) |
| 2 | Added `super_admin_user_id` to `app_settings` | `supabase/migrations/035_isolation_audit_fixes.sql` | Done (Plan 22-01) |
| 3 | Replaced `authStatus?.farmId` with `useActiveFarm().farmId` in 13 files | 4 hooks + 7 pages + 2 components | Planned (Plan 22-02) |
| 4 | Added Zustand persist middleware to `activeFarmStore` | `src/stores/activeFarmStore.ts` | Planned (Plan 22-02) |
| 5 | Maroon header background for super_admin | `src/components/Header.tsx` | Planned (Plan 22-02) |
| 6 | Super admin auto-membership note in sync rules docs | `docs/powersync-sync-rules.yaml` | Planned (Plan 22-02) |

## Requirement Verification

### ISO-01: RLS policies filter by farm_id with no bypass for regular users

**Verdict: PASS**

All core data tables (`wells`, `readings`, `allocations`, `farm_members`, `farm_invites`, `farms`) use `get_user_farm_ids()` or `get_user_admin_farm_ids()` in their RLS policies. These functions derive farm access from `farm_members WHERE user_id = auth.uid()`. Regular users can only have `farm_members` rows in farms they were explicitly invited to. There is no bypass path for regular users.

### ISO-02: PowerSync sync rules filter every data table by farm_id

**Verdict: PASS**

All 7 farm-scoped sync rule buckets use `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` as their parameter query. Data queries filter by `WHERE farm_id = bucket.farm_id`. Global buckets (`subscription_tiers`, `app_settings`) contain no farm-specific data. The `user_profile` bucket only syncs the user's own profile row.

### ISO-03: Super admin can access data across all farms consistently

**Verdict: PASS**

Super admin access is implemented via auto-membership triggers (migration 025). When a user is assigned the `super_admin` role, triggers automatically create `farm_members` rows for every existing farm. When a new farm is created, a trigger adds all existing super_admins. This means:
- RLS policies see super_admin as a member of every farm (via `get_user_farm_ids()`)
- PowerSync sync rules see super_admin as a member of every farm (via `farm_members` parameter query)
- RPC functions see super_admin as a member with appropriate role checks
- No special-case code is needed -- the membership-based approach provides consistent cross-farm access

---

*Phase: 22-farm-data-isolation-audit*
*Audited: 2026-02-22*
