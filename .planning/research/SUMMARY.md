# Project Research Summary

**Project:** AG Water Tracker v3.0 -- Subscriptions & Permissions
**Domain:** Offline-first SaaS subscription tier management with role-based permission enforcement
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

This milestone converts a single-plan agricultural water tracking PWA into a multi-tier subscription system with granular role permissions and login-only authentication. The research confirms this is primarily a **code and schema change, not a stack change**. Zero new npm packages are required -- the existing PowerSync offline-first architecture, Supabase RLS system, and React permission framework already provide everything needed.

The recommended approach is database-driven configuration: create `subscription_tiers` and `app_settings` tables in Supabase, sync them globally to all clients via PowerSync, and refactor the hardcoded `PLAN_LIMITS` constant into reactive hooks that query the local SQLite database. Role permission enforcement requires extending the existing 106-line `permissions.ts` matrix with three new fine-grained actions (`edit_well`, `delete_well`, `manage_allocations`) and tightening RLS policies to match. The login-only authentication flow simplifies the codebase by removing self-service registration pages -- users are now pre-registered via the existing invite system.

The primary risk is **offline data corruption from premature RLS tightening**. If RLS policies are updated before clients deploy permission gating UI changes, meter checkers with pending offline writes in their PowerSync upload queue will encounter permanent transaction failures when those queued edits sync back. The mitigation is strict deployment sequencing: client-side UI gating first, 24-48 hour queue drain period, then server-side RLS changes. Secondary risks include config tables not syncing offline (breaking limit enforcement) and invite auto-matching logic coupled to removed onboarding pages. Both are preventable with proper PowerSync sync rules and backend RPC refactoring.

## Key Findings

### Recommended Stack

**No new dependencies required.** The existing stack handles all v3.0 features:

**Core technologies:**
- **PowerSync global buckets**: Sync `subscription_tiers` and `app_settings` tables to all clients for offline-available tier limits -- no external RPC needed when offline
- **Supabase RLS + custom JWT claims**: Existing `get_user_admin_farm_ids()` helper restricts UPDATE/DELETE operations to grower and admin roles -- just needs tightening for wells and allocations
- **React permission matrix**: Existing `permissions.ts` (106 lines, type-safe) extends cleanly with new fine-grained actions -- no RBAC library needed for 4 roles and 12 actions
- **Zustand + PowerSync hooks**: UI state (Zustand) and synced data (PowerSync) separation proven in v1.0-v2.0 -- no need for TanStack Query

**Version compatibility:** All installed packages support required features with no version bumps needed. PowerSync 1.32.0 has `TableV2` for schema definitions, Supabase 2.93.3 handles auth OTP and RLS, React Router 7.13.0 provides route guards.

**What NOT to add:** Stripe SDK (payment integration deferred), CASL/permission library (overkill for 4 roles), TanStack Query (duplicate of PowerSync), feature flag service (tiers serve as feature flags).

### Expected Features

**Must have (table stakes):**
- **DB-driven subscription tiers table** with per-role seat limits and well limits synced offline via PowerSync -- replaces hardcoded `PLAN_LIMITS` constant
- **Farm-to-tier linkage** via `farms.subscription_tier` column defaulting to 'basic' -- each farm has discoverable limits
- **Well count enforcement** in UI (disable "New Well" button at tier limit) and backend (RPC/trigger check) -- Basic: 5 wells, Pro: 10 wells
- **Seat limit enforcement refactored** to read from synced tier data instead of constants -- consistent offline and online
- **Meter checker role restrictions**: hide well edit button, hide allocation create/edit/delete, hide user invite button -- completes RBAC implementation
- **Login-only auth flow** with registration pages removed -- users pre-registered via invite system, no self-service onboarding
- **"No subscription" redirect page** for authenticated users without farm membership -- clear messaging with link to external subscription website
- **Farm data isolation audit** verifying RLS policies and PowerSync sync rules prevent cross-farm data leakage

**Should have (competitive advantages):**
- **Offline-available tier limits** via PowerSync sync -- limit checks work without network, unlike competitors requiring online API calls
- **Graceful limit-reached UX** showing proactive "upgrade to add more" messages at point of action, not error messages after failure
- **Real-time tier changes** via PowerSync sync -- admin upgrades a farm tier in DB, all farm members see updated limits within seconds without app restart
- **Permission matrix as single source of truth** with typed actions preventing scattered role string comparisons

**Defer (v2+):**
- **Backend RPC seat/well limit enforcement** (currently UI-only for well limits) -- add server-side checks to `invite_user_by_phone_impl` and well creation
- **Super admin tier management UI** for changing farm tiers (currently requires direct DB edit)
- **Tier upgrade/downgrade handling** defining policy for farms exceeding new limits after downgrade
- **Stripe Customer Portal integration** updating `farms.subscription_tier` on payment webhooks (after landing page built)

### Architecture Approach

This is an **extension architecture, not greenfield**. Every v3.0 feature maps to an existing pattern: subscription tier tables use the same PowerSync global bucket pattern as other config data, role permissions extend the existing `PERMISSION_MATRIX`, and the login-only flow simplifies existing `RequireOnboarded` guard logic.

**Major components:**

1. **Subscription tier system** -- Two new DB tables (`subscription_tiers`, `app_settings`) synced via PowerSync global buckets to all clients, queried by new `useSubscriptionTier()` and `useAppSettings()` hooks that replace hardcoded constants
2. **Permission enforcement layers** -- Three-layer defense: route guards (`RequireRole`), UI visibility (`hasPermission()`), and RLS policies (`get_user_admin_farm_ids()`) all checking the extended permission matrix
3. **Simplified auth flow** -- Remove `ProfilePage`, `CreateFarmPage`, `RequireNotOnboarded` components and onboarding routes; redirect users without farm membership to new `NoSubscriptionPage` instead of wizard
4. **Read-only config sync** -- Config tables excluded from connector `ALLOWED_TABLES` (no client writes) but included in sync rules (global read access) following existing pattern for server-managed data

**Data flow:** Farm -> subscription_tier FK -> subscription_tiers table -> PowerSync global bucket -> local SQLite -> `useSubscriptionTier()` hook -> UI components check limits. Permissions checked at route level (guard), component level (conditional render), and database level (RLS). Invite auto-matching moves from removed client onboarding pages to server-side RPC.

### Critical Pitfalls

1. **Subscription tier config not synced offline breaks limit enforcement** -- Config tables must be added to PowerSync sync rules AND client schema or offline users silently bypass limits; prevented by adding global bucket definitions, with hardcoded fallback for cold start edge case

2. **Tightening RLS policies discards queued offline writes** -- Meter checkers with pending well edits in PowerSync upload queue encounter permanent transaction failure when RLS restricts them post-deployment; prevented by deploying client UI gating first, waiting 24-48h for queues to drain, then deploying RLS changes

3. **Removing registration breaks invite auto-matching** -- Current invite flow couples phone-to-farm-membership matching with removed `ProfilePage`/`CreateFarmPage`; prevented by moving auto-match logic to backend RPC that runs on OTP verification before removing client pages

4. **Allocations and wells RLS wide open to all members** -- Migrations 031-032 relaxed UPDATE/DELETE policies from `get_user_admin_farm_ids()` to `get_user_farm_ids()`, allowing meter checkers to mutate data via API bypass; prevented by tightening policies to match v3.0 requirements with same deployment sequencing as pitfall #2

5. **No server-side seat/well limit enforcement** -- Current `invite_user_by_phone_impl` RPC has no seat count check, only client-side `useSeatUsage` hook; prevented by adding tier limit queries to RPCs before INSERT operations

## Implications for Roadmap

Based on research, suggested phase structure organized by dependency chains and risk isolation:

### Phase 1: Database Foundation (Zero Client Impact)
**Rationale:** All downstream work depends on these tables existing. RLS changes ship safely because current UI already lacks role-specific gating -- server-side restriction is the safety net.
**Delivers:** `subscription_tiers` and `app_settings` tables with seed data, `farms.subscription_tier` column with FK and default, tightened RLS policies for wells and allocations (grower+admin only for UPDATE/DELETE), SELECT-only RLS for config tables
**Addresses:** Table stakes foundation for tier system, closes security gap from PITFALLS.md (allocations/wells wide open)
**Avoids:** Pitfall #4 and #6 (RLS too permissive) by making database match v3.0 permission expectations

### Phase 2: PowerSync Integration (Schema + Sync Rules)
**Rationale:** Client hooks in Phase 3 require data availability in local SQLite. Independent deployment allows verification of sync before UI changes.
**Delivers:** `subscription_tiers` and `app_settings` added to `powersync-schema.ts`, global bucket added to PowerSync Dashboard sync rules, `subscription_tier` column added to farms sync rules and schema
**Uses:** PowerSync global bucket pattern for non-farm-scoped config data
**Avoids:** Pitfall #1 (config not synced offline) by ensuring tier limits available in local SQLite
**Verification:** Open app offline, check local SQLite includes subscription_tiers rows with correct data

### Phase 3: Subscription Tier Hooks + Subscription Page
**Rationale:** These hooks bridge new DB tables to UI. SubscriptionPage is ideal validation target -- if it shows correct tier data, the hook architecture works.
**Delivers:** `useSubscriptionTier()` hook (two-query composition for farm -> tier lookup), `useAppSettings()` hook, `useWellCount()` hook for limit checking, refactored `useSeatUsage.ts` reading from `useSubscriptionTier()` instead of `PLAN_LIMITS`, simplified `subscription.ts` (types only), rebuilt `SubscriptionPage` showing DB tier + usage stats + "Manage Plan" link
**Uses:** PowerSync `useQuery` two-query composition pattern (no JOIN support)
**Avoids:** Pitfall #14 (well limits not in permission model) by creating separate quota-based enforcement parallel to role-based permissions
**Verification:** Subscription page shows correct tier name, seat usage, well count, and external link from app_settings

### Phase 4: Permission Enforcement (UI Gating Only)
**Rationale:** Deploy client-side permission gating BEFORE RLS tightening to prevent new unauthorized writes entering offline queues. Must precede Phase 1 RLS deployment by 24-48h in production.
**Delivers:** New actions in `permissions.ts` (`edit_well`, `delete_well`, `manage_allocations`), `PERMISSION_MATRIX` updated (meter_checker excluded from new actions), `RequireRole` route guards on `/wells/:id/edit` and `/wells/:id/allocations`, conditional rendering in `WellDetailHeader` (edit button), `WellAllocationsPage` (write actions), and `UsersPage` (invite button)
**Implements:** Three-layer permission defense (route, UI, RLS) but only deploys layers 1-2 in this phase
**Avoids:** Pitfall #2 (queued offline writes discarded) by ensuring no new unauthorized operations enter queue before RLS tightens
**Verification:** Meter checker cannot see edit buttons or access edit routes, but can still edit via direct API (RLS still permissive in Phase 1)

### Phase 5: Login-Only Auth Flow (Breaking Change)
**Rationale:** Most disruptive change removes existing code paths. Do last when rest of system is stable. Requires backend auto-matching from Phase 4.5.
**Delivers:** `NoSubscriptionPage` component (PowerSync-independent, uses `useAuth` only), simplified `AuthProvider.tsx` (remove `hasProfile` check), simplified `RequireOnboarded.tsx` (redirect to /no-subscription), updated `App.tsx` routes (remove onboarding, add /no-subscription), deletion of `ProfilePage.tsx`, `CreateFarmPage.tsx`, `RequireNotOnboarded.tsx`
**Implements:** Login-only pattern replacing self-service registration wizard
**Avoids:** Pitfall #3 (auto-matching breaks), #4 (stale onboarding cache), #10 (RPC intermediate states), #11 (orphaned imports), #13 (NoSubscriptionPage without PowerSync)
**Dependency:** Requires Phase 4.5 backend auto-matching deployed first
**Verification:** Fresh invite user completes OTP, lands on dashboard with correct farm data (not removed onboarding routes)

### Phase 4.5: Backend Auto-Matching (Pre-Phase 5 Blocker)
**Rationale:** Must deploy before Phase 5 removes client-side auto-matching pages. Converts client logic to server trigger/RPC.
**Delivers:** Updated `get_onboarding_status` RPC or new trigger that auto-creates `users` row and `farm_members` entry on first OTP verification if matching `farm_invites` exists
**Avoids:** Pitfall #3 (invite users locked out) by ensuring auto-matching survives onboarding removal
**Verification:** Create test invite, use fresh phone, complete OTP. User should have profile and farm membership without touching removed pages.

### Phase 6: Farm Data Isolation Verification (Audit)
**Rationale:** All features must be built before comprehensive testing. Validates final state of all DB changes.
**Delivers:** Audit all RLS policies for consistent `farm_id` filtering, verify PowerSync sync rules match RLS, verify super_admin cross-farm bypass consistent across tables, test meter_checker restrictions (UI + RLS), test user without farm sees NoSubscriptionPage, test tier change propagates to app
**Avoids:** Pitfall #7 (super_admin bypass inconsistent), #18 (disabled users still sync)
**Verification:** Test matrix of role x action x resource with both UI and direct API attempts

### Phase Ordering Rationale

- **Foundation before integration:** Database tables (Phase 1) before PowerSync sync (Phase 2) before hooks (Phase 3) follows dependency chain
- **UI gating before RLS tightening:** Phase 4 client-side permission UI deployed 24-48h before Phase 1 RLS changes to prevent offline queue corruption
- **Backend auto-matching before page removal:** Phase 4.5 server logic deployed before Phase 5 removes client onboarding to prevent invite user lockout
- **Verification last:** Phase 6 audit runs after all feature code shipped to validate complete system
- **Risk isolation:** Each phase has clear rollback point -- Phase 1 is DB-only (rollback = migration revert), Phase 2 is sync-only (rollback = sync rule revert), Phase 3 is hooks-only (rollback = code deploy), etc.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4.5 (Backend Auto-Matching):** Complex RPC refactoring touching auth triggers -- needs careful testing of edge cases like expired invites, duplicate phone numbers, and race conditions between OTP verification and farm_invites lookup
- **Phase 6 (RLS Audit):** Super admin cross-farm bypass pattern (migration 025 auto-add trigger) has documented fragility from search_path issues -- may need defensive RLS rewrite using role-based UNION pattern instead of trigger-based membership

Phases with standard patterns (skip research-phase):
- **Phase 1 (Database Foundation):** Standard Supabase migrations, well-documented RLS patterns
- **Phase 2 (PowerSync Integration):** PowerSync global bucket pattern documented in official docs, codebase has existing examples
- **Phase 3 (Hooks):** PowerSync two-query composition is established pattern in codebase
- **Phase 4 (Permission Enforcement):** Extends existing permission.ts and RequireRole patterns proven in v1.0-v2.0
- **Phase 5 (Login-Only):** Code removal with clear checklist, TypeScript compiler validates completeness

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages needed. All features map to existing capabilities verified in codebase. PowerSync global buckets documented in official docs. |
| Features | HIGH | Requirements well-defined in PROJECT.md. Existing code inventory shows what's already built. Competitor analysis validates feature expectations. |
| Architecture | HIGH | Direct codebase analysis of 32 migrations, auth provider, connector, permission matrix. All integration points verified. PowerSync sync rule patterns proven. |
| Pitfalls | HIGH | Traced through actual code (connector error handling, RLS policies, auth flow, PowerSync sync rules). Documented search_path trigger bugs from MEMORY.md. |

**Overall confidence:** HIGH

### Gaps to Address

- **Seat/well limit server enforcement details:** Research confirmed limits must be checked in RPCs, but exact implementation (trigger vs RPC vs constraint) needs design decision during Phase 1 planning. Recommendation: RPC check before INSERT for clear error messages, plus CHECK constraint as fallback defense.

- **Super admin cross-farm bypass reliability:** Migration 025 auto-add trigger has documented search_path fragility. Phase 6 audit should verify trigger works, but defensive RLS rewrite (role-based UNION in `get_user_farm_ids()`) is recommended alternative to reduce dependency on trigger perfection.

- **Tier upgrade/downgrade handling:** Research identified this as P3 (defer to v3.x), but policy decision needed: when farm downgrades from Pro (10 wells) to Basic (5 wells) with 8 existing wells, does system (a) soft-block new wells only, or (b) force well deletion? Recommendation: defer decision until Stripe integration, implement soft-block (simplest).

- **Disabled user sync behavior:** Migration 029/030 dropped disable feature, but verify current state. If re-implemented, ensure sync rules filter `WHERE disabled = false` or rely on `farm_members` row deletion to stop sync naturally.

## Sources

### Primary (HIGH confidence)
- AG Water Tracker codebase: `src/lib/permissions.ts`, `src/lib/subscription.ts`, `src/lib/powersync-connector.ts`, `src/lib/powersync-schema.ts`, `src/lib/AuthProvider.tsx`, `src/lib/resolveNextRoute.ts`, `src/hooks/useSeatUsage.ts`, `src/components/RequireOnboarded.tsx`, `src/components/RequireRole.tsx`, `src/App.tsx`, all 32 Supabase migrations
- [PowerSync Sync Rules Documentation](https://docs.powersync.com/usage/sync-rules) -- global bucket pattern, parameter queries
- [PowerSync Client Architecture](https://docs.powersync.com/architecture/client-architecture) -- upload queue, transaction completion
- [PowerSync RLS and Sync Rules](https://docs.powersync.com/integration-guides/supabase-+-powersync/rls-and-sync-rules) -- RLS policy and sync rule relationship
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS policy patterns, SELECT-only policies
- PROJECT.md and MEMORY.md from codebase -- v3.0 requirements, documented bugs

### Secondary (MEDIUM confidence)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- multi-tenant data isolation
- [PowerSync January 2026 Changelog](https://www.powersync.com/blog/powersync-changelog-january-2026) -- latest SDK features
- [Implementing RBAC in React (Permit.io)](https://www.permit.io/blog/implementing-react-rbac-authorization) -- frontend RBAC patterns
- [Modeling SaaS Subscriptions in Postgres](https://axellarsson.com/blog/modeling-saas-subscriptions-in-postgres/) -- DB schema patterns
- [Entitlement Management for SaaS](https://verustrust-licensing.com/blog/entitlement-management-for-saas-guide/) -- feature gating patterns

### Tertiary (LOW confidence)
- Competitor analysis: Farmbrite Plans & Pricing, RouteManager Meter Reading Software, Edwards Aquifer Authority Meter App -- validation of role patterns and tier structure conventions

---
*Research completed: 2026-02-22*
*Ready for roadmap: yes*
