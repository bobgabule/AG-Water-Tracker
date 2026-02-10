# Project Research Summary

**Project:** AG Water Tracker - Role-Based User Management Milestone
**Domain:** Agricultural water tracking PWA with offline-first capabilities
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

This project adds role-based access control (RBAC) and phone-based invite flows to an existing offline-first agricultural water tracking PWA. The research confirms the architecture is already well-designed with a three-layer enforcement model (Supabase RLS, PowerSync sync rules, client-side guards) in partial implementation. The core challenge is completing and hardening this architecture for a full 4-role system (super_admin, grower, admin, meter_checker) while avoiding seven critical pitfalls identified in existing code.

The recommended approach prioritizes stabilization before feature expansion. Three existing issues (SECURITY DEFINER functions exposed via API, infinite spinner on failed onboarding RPC, stale data after role changes) must be resolved before adding new roles or subscription features. The stack requires no new dependencies for RBAC or invite flows — all needed infrastructure (Supabase Auth, PowerSync, Twilio Edge Function) is already in place. The only future addition is Stripe for subscription billing, which should be deferred until actual paying customers exist.

Key risks center on data consistency across three independent systems (database roles, sync rules, client permissions) and silent data loss when offline-created records are rejected by RLS on sync. Both risks are mitigated through a centralized permission matrix, client-side validation before writes, and user notification for rejected operations. The feature set is well-scoped with clear differentiation between MVP (v1), post-validation (v1.x), and deferred (v2+) features, ensuring the team can ship incrementally without over-engineering.

## Key Findings

### Recommended Stack

The research confirms that **no new npm packages are needed** for the core RBAC and invite functionality. The existing stack (Supabase, PowerSync, React 19, Twilio Edge Functions) handles all requirements. The architecture relies on Supabase Custom Access Token Hooks (platform feature) to inject user roles into JWT claims, eliminating per-request role lookups and enabling PowerSync sync rules to filter by role without additional database joins.

**Core technologies:**
- **Supabase Custom Access Token Hook** (platform feature): Injects `user_role` and `farm_id` into JWT claims at token issuance — reads live data from `farm_members` on every auth refresh, eliminating stale role data
- **PowerSync `request.jwt()` in sync rules**: Access custom JWT claims in parameter queries — enables role-based data filtering at sync layer without database joins
- **Permission matrix (`lib/permissions.ts`)**: Centralized role-to-permission mapping as single source of truth — all client-side checks reference this, avoiding scattered role comparisons across components
- **Supabase Edge Functions (Deno)**: Server-side SMS sending via Twilio Programmable Messaging API — already implemented in `send-invite-sms`, keeps credentials server-side
- **Stripe Checkout** (future, deferred): Subscription creation and management — only add when implementing billing, NOT needed for MVP user limits

**Critical architecture decision:** Use Custom Access Token Hook instead of `app_metadata` for roles. The hook fires every time a token is issued, so it always reads the current role from `farm_members` without stale-data risk. `app_metadata` requires service_role key to write and is not automatically updated when roles change.

### Expected Features

Research shows the existing codebase has **75% of the invite flow already implemented**, with core infrastructure complete but UI components and role enforcement incomplete. The MVP focuses on finishing what's started rather than building new systems.

**Must have (table stakes):**
- **Role-based access control (4 roles)** — Every competitor has roles; farm owners expect control over who can do what
- **Invite users by phone number** — Target users are field workers who check SMS, not email
- **Admin can view team member list** — Standard expectation for multi-user apps
- **Admin can add/remove users** — Universal across AgriWebb, Farmable, Mobble, Heirloom
- **Phone OTP authentication** — Already working; passwordless is standard for mobile-first field apps
- **Invite status visibility** — Admins need to see pending/expired/accepted status
- **Differentiated onboarding paths** — Growers need full onboarding (profile + farm), invited users skip to app

**Should have (competitive advantage):**
- **Pre-registration invite (admin fills in user details)** — Admin pre-fills name/phone/role; profile auto-created on OTP verify. Genuine differentiator over competitors who require invited users to manually create profiles.
- **Phone-based auto-match on OTP** — No invite code needed; user verifies phone and is auto-matched to farm. Unique in ag space.
- **Offline user management visibility** — Member list and invite status visible offline via PowerSync. Competitors with server-only user management break offline.
- **SMS invite with deep link** — SMS contains link that opens PWA directly or app store. Reduces steps vs. email invites.

**Defer (v2+):**
- **Stripe subscription billing** — Premature optimization; need product-market fit first. UI-only seat limits sufficient for MVP.
- **Multi-farm membership** — Adds query complexity everywhere. Single farm per user for v1.
- **User activity audit log** — Not needed for water tracker MVP. `created_by` on readings provides basic accountability.
- **Granular per-feature permissions** — 4 simple roles sufficient. AgriWebb's 12+ roles with toggles is overkill for small farms.

### Architecture Approach

The architecture implements **three-layer role enforcement** (mandatory for offline-first security): Supabase RLS prevents unauthorized data access at database level, PowerSync sync rules prevent unauthorized data from reaching devices, and client-side guards provide responsive UX without network latency. All three layers already exist in partial form and must be completed and synchronized.

**Major components:**
1. **Permission Matrix (`lib/permissions.ts`)** — Central source of truth mapping roles to actions (e.g., 'wells:create', 'team:invite'). All client-side checks reference this via `hasPermission(role, permission)`. Prevents scattered `role === 'admin'` checks.
2. **useUserRole() hook** — Reads user's role from PowerSync local SQLite (`farm_members` table). Works offline. Returns null if no role found. Consumed by route guards and UI permission checks.
3. **RequireRole route guard** — Extends existing `RequireAuth` -> `RequireOnboarded` hierarchy. Checks user's role meets minimum required for a route. Redirects unauthorized users.
4. **Server-side auto-matching invite flow** — `get_onboarding_status()` RPC auto-matches user's phone against pending `farm_invites`. Creates users row + farm_members row atomically. Enables zero-friction invite experience (no code entry).
5. **Three-layer write enforcement** — Client-side guard (hide/disable UI), PowerSync local write (immediate optimistic update), Supabase RLS enforcement (permanent error handling for unauthorized writes). Each layer serves a distinct purpose.

**Critical pattern:** Offline-safe role reads via PowerSync local DB. Never call server for role checks — always query local `farm_members` table. This ensures permission checks work offline but accepts staleness (if role changes server-side, client picks it up on next sync).

### Critical Pitfalls

Research identified seven critical pitfalls with existing code patterns. Top five must be addressed before adding new features:

1. **Stale data on local device after role downgrade or removal** — PowerSync sync rules are additive (control what flows to client, not what gets removed). When a user's role changes or they're removed, locally cached data persists until `disconnectAndClear()` is called. **Prevention:** Watch `farm_members` table for role changes; trigger `disconnectAndClear()` + re-sync automatically. Handle member removal via `onAuthStateChange` detecting no farm membership.

2. **RLS policy recursion and performance degradation** — Helper functions like `get_user_farm_ids()` may be called per-row instead of once per query, causing severe performance issues with 100+ wells. **Prevention:** Wrap helper calls in scalar subquery `(SELECT * FROM get_user_farm_ids())` for initPlan caching. Add indexes on `farm_members(user_id, role)`. Create single `get_user_role_for_farm(p_farm_id)` function instead of multiple `get_user_*_farm_ids()` functions.

3. **PowerSync sync rules and Supabase RLS policy mismatch** — Sync rules live on PowerSync dashboard (not in codebase), while RLS lives in SQL migrations. Manual dashboard updates are forgotten, causing state where client receives data it cannot write back (RLS blocks upload). **Prevention:** Add pre-deployment checklist item. Create verification script comparing dashboard with YAML docs. Document role-to-bucket mapping upfront.

4. **SECURITY DEFINER functions exposed via Supabase API** — All SECURITY DEFINER functions in `public` schema are automatically exposed via PostgREST API. Current code has 7 such functions; helper functions like `get_user_farm_ids()` leak farm IDs. **Prevention:** Move all helper functions to `private` schema. Only keep user-facing RPCs in `public`. Audit with `SELECT * FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef = true`.

5. **Offline-created records silently discarded by PowerSync connector** — Current connector treats RLS violations as permanent errors and calls `transaction.complete()`, silently discarding failed operations. When meter_checker creates well offline (no client-side role check), it appears in UI then disappears on sync with no notification. **Prevention:** Add client-side role checks via `usePermissions()` hook. Disable write UI for unauthorized roles. Log discarded transactions to local `sync_errors` table and surface to user.

**Additional pitfalls (address in phases):**
6. **get_onboarding_status() RPC as authentication bottleneck** — Single RPC does profile check, farm membership check, phone invite matching, profile auto-creation, and membership auto-creation. Causes infinite spinner on failure (documented known issue). Adding role/subscription logic increases fragility.
7. **Role enum mismatch across three systems** — Roles stored as plain text in database, sync rules, and TypeScript code with no single source of truth. Transitioning from 3-role to 4-role system risks silent failures if any system uses old role names.

## Implications for Roadmap

Based on research, suggested phase structure prioritizes **stabilization before expansion**. The existing codebase has critical issues that compound when new features are added. Fixing these first reduces risk and debugging time.

### Phase 1: Foundation & Stabilization
**Rationale:** Research identified 3 blocking issues (SECURITY DEFINER exposure, onboarding RPC bottleneck, stale data after role changes) that affect security and UX. These must be resolved before adding new roles or features.

**Delivers:**
- Move SECURITY DEFINER helper functions to `private` schema (Pitfall #4)
- Add fallback for failed `get_onboarding_status()` RPC using locally cached data (Pitfall #6)
- Implement role change detector that triggers `disconnectAndClear()` on role update (Pitfall #1)
- Remove `console.log` spam from production code

**Addresses:**
- **Security:** SECURITY DEFINER functions exposed via API (PITFALLS.md critical #4)
- **UX:** Infinite spinner on failed onboarding (PITFALLS.md critical #6, documented known issue)
- **Data integrity:** Stale data after role changes (PITFALLS.md critical #1)

**Avoids:** Building new features on top of known bugs; compounding technical debt

### Phase 2: Permission System & Role Definition
**Rationale:** Establishes the permission foundation (types, matrix, hooks) that all subsequent phases depend on. No UI changes yet, just TypeScript modules and database schema. Prevents role enum mismatch (Pitfall #7).

**Delivers:**
- `types/roles.ts` defining `FarmRole` union type
- `lib/permissions.ts` with permission matrix and `hasPermission()` function
- `hooks/useUserRole.ts` for offline-safe role reads
- Migration adding `viewer` role to CHECK constraint
- Migration creating `get_user_role_for_farm(p_farm_id)` optimized helper function

**Uses:**
- Permission matrix pattern (ARCHITECTURE.md pattern #2)
- Offline-safe role reads via PowerSync local DB (ARCHITECTURE.md pattern #3)

**Implements:**
- Permission Matrix component (ARCHITECTURE.md component #1)
- useUserRole() hook (ARCHITECTURE.md component #2)

**Avoids:** Role enum mismatch across systems (PITFALLS.md critical #7)

### Phase 3: Client-Side Permission Enforcement
**Rationale:** Implements the UI layer of three-layer enforcement. Depends on Phase 2 (permission matrix). Prevents silent data loss from offline-created records (Pitfall #5).

**Delivers:**
- `components/RequireRole.tsx` route guard
- Client-side permission checks before PowerSync writes (every `db.execute()`)
- Role-based UI gating in existing components (SettingsPage, DashboardPage)
- User notification system for rejected sync operations

**Addresses:**
- **Table stakes:** Role-based access control (FEATURES.md)
- **UX:** Silently discarded offline writes (PITFALLS.md critical #5)

**Uses:**
- Three-layer role enforcement (ARCHITECTURE.md pattern #1)
- `useUserRole()` and `hasPermission()` from Phase 2

**Avoids:** Users creating records offline that will be rejected on sync without notification

### Phase 4: RLS & Sync Rules Hardening
**Rationale:** Completes server-side and sync-layer enforcement. Depends on Phase 2 (role definitions). Addresses performance and security at database level (Pitfall #2, #3).

**Delivers:**
- Updated RLS policies using optimized helper function from Phase 2
- PowerSync sync rules updated for 4-role system
- Verification script comparing dashboard sync rules with YAML docs
- Indexes on `farm_members(user_id, role)` if not present

**Addresses:**
- RLS performance degradation (PITFALLS.md critical #2)
- Sync rules / RLS mismatch (PITFALLS.md critical #3)

**Uses:**
- Custom Access Token Hook (STACK.md recommended #1)
- PowerSync `request.jwt()` in sync rules (STACK.md recommended #2)

**Implements:**
- Three-layer enforcement (server + sync layers of ARCHITECTURE.md pattern #1)

**Avoids:** Performance issues at 100+ wells, sync/RLS inconsistency blocking uploads

### Phase 5: User Management UI Completion
**Rationale:** Completes the user-facing features. Depends on Phases 2, 3, 4 (permission system, client guards, RLS). Delivers MVP table stakes features.

**Delivers:**
- Full member list page (active users with roles)
- Disable/enable user toggle (soft disable, not delete)
- First/last name split on invite form
- Differentiated onboarding routing (invited users skip farm creation)
- Subscription seat limit UI (UI-only enforcement, no Stripe)

**Addresses:**
- **Must have:** Admin view team member list (FEATURES.md table stakes)
- **Must have:** Admin can add/remove users (FEATURES.md table stakes)
- **Must have:** Differentiated onboarding paths (FEATURES.md table stakes)
- **Should have:** Pre-registration invite with auto-created profiles (FEATURES.md differentiator)

**Implements:**
- Server-side auto-matching invite flow (ARCHITECTURE.md component #4)

**Avoids:** Over-engineering by deferring Stripe integration to post-MVP

### Phase 6: SMS & Deep Link Polish
**Rationale:** Final polish for invite flow. Low-risk, enhances UX but not blocking for core functionality.

**Delivers:**
- Verify SMS deep link behavior and PWA install flow
- Resend invite SMS if first failed or expired
- Confirmation dialogs for destructive actions (remove user, revoke invite)
- More prominent SMS failure warning in AddUserModal

**Addresses:**
- **Should have:** SMS invite with deep link (FEATURES.md differentiator)
- **UX:** Better feedback for SMS failures (PITFALLS.md UX section)

**Uses:**
- Existing `send-invite-sms` Edge Function (STACK.md #3)
- Twilio Programmable Messaging API (STACK.md #3)

### Phase Ordering Rationale

- **Phase 1 before all others:** Fixes existing bugs that would compound when new features are added. Moving SECURITY DEFINER functions to private schema is a one-time migration that prevents security issues. Fixing the onboarding RPC bottleneck prevents user frustration.

- **Phase 2 before 3, 4, 5:** Permission types and matrix are dependency for all role-based code. Creating this foundation first prevents refactoring later.

- **Phase 3 and 4 can run in parallel:** Client-side guards and RLS policies are independent (both depend on Phase 2 but not each other). However, sequential is safer to verify consistency.

- **Phase 5 depends on 2, 3, 4:** UI components consume permission system, require client guards and RLS to function correctly.

- **Phase 6 last:** Polish that enhances but doesn't block core functionality.

**Dependency chain:** Phase 1 → Phase 2 → (Phase 3 + Phase 4) → Phase 5 → Phase 6

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (RLS & Sync Rules):** PowerSync sync rules SQL subset is not fully documented. Need to test complex role checks in parameter queries to verify they work. May need to fall back to simpler bucket-per-role approach.
- **Phase 6 (SMS & Deep Links):** PWA deep link behavior varies by browser/OS. May need device testing matrix to verify link handling.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Stabilization):** PostgreSQL schema operations, error boundaries, data clearing are well-documented
- **Phase 2 (Permission System):** TypeScript type definitions and React hooks are standard patterns
- **Phase 3 (Client-Side Enforcement):** React route guards and conditional rendering are established patterns
- **Phase 5 (User Management UI):** CRUD forms and lists are well-understood React patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified via official Supabase + PowerSync docs and Context7. Existing codebase already uses recommended patterns. No new dependencies needed for RBAC/invite flows. |
| Features | MEDIUM-HIGH | Table stakes features confirmed via competitor analysis (AgriWebb, Farmable, Mobble, Heirloom). Differentiators (phone auto-match, pre-registration invite) are genuinely unique but require careful UX testing. |
| Architecture | HIGH | Three-layer enforcement pattern is proven approach for offline-first RBAC. Existing codebase analysis shows 75% already implemented. Dependency graph is clear. |
| Pitfalls | HIGH | All 7 critical pitfalls verified via official docs, codebase analysis, and documented known issues in MEMORY.md. Recovery strategies tested. |

**Overall confidence:** HIGH

### Gaps to Address

Research was thorough but identified areas needing validation during implementation:

- **PowerSync sync rules SQL subset:** Documentation states parameter queries support "limited SQL." Exact limitations not specified. Need to test whether complex role checks like `request.jwt() ->> 'user_role' IN ('grower', 'admin')` work or if simpler bucket-per-role approach is required. Addressed during Phase 4 planning.

- **Role transition edge cases:** When a user exists in multiple farms with different roles, how does the single-farm-per-user model handle invites to a second farm? Current `get_onboarding_status()` auto-creates membership if user has no farm, but behavior for existing users is unclear. Validate during Phase 5 implementation.

- **Subscription seat limits enforcement point:** Research recommends UI-only enforcement for MVP, but doesn't specify whether `invite_user_by_phone` RPC should also check limits (preventing API abuse). Decision needed during Phase 5: add RPC validation or defer entirely to Stripe integration.

- **Deep link scheme registration:** PWA manifest can register URL protocol handlers, but support varies by browser. Android/iOS app links require additional configuration. Determine during Phase 6 whether to use universal links (HTTPS) or custom scheme (agwater://).

## Sources

### Primary (HIGH confidence)
- Context7: `/supabase/supabase` — Custom claims, RLS RBAC patterns, Edge Functions SMS
- Context7: `/llmstxt/powersync_llms-full_txt` — Sync rules, parameter queries, JWT access
- [Supabase Custom Claims & RBAC Guide](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — Official docs (verified 2026-02-09)
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — Official docs (verified 2026-02-09)
- [PowerSync Sync Rules Documentation](https://docs.powersync.com/usage/sync-rules) — Official docs
- [PowerSync Client Parameters](https://docs.powersync.com/usage/sync-rules/advanced-topics/client-parameters) — Official docs
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — Infinite recursion pattern, SECURITY DEFINER best practices
- Existing codebase: migrations 006-019, AuthProvider.tsx, powersync-connector.ts, SettingsPage.tsx (HIGH confidence)

### Secondary (MEDIUM confidence)
- [AgriWebb User Management](https://help.agriwebb.com/en/articles/2630040-user-management) — Competitor analysis, role patterns
- [Farmable Team Member Permissions](https://support.farmable.tech/en/articles/6227733-what-permissions-can-you-assign-team-members) — 4-role model reference
- [Mobble Add Team Member](https://www.mobble.io/us/help/add-a-new-user) — Invite flow patterns
- [Heirloom Inviting Collaborators](https://docs.heirloom.ag/help/team-management/inviting-collaborators-to-your-farm/) — 4-tier role system
- [Authgear Login/Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide) — Passwordless phone OTP best practices
- [RBAC Best Practices 2025](https://www.cloudtoggle.com/blog-en/role-based-access-control-best-practices/) — Role-based provisioning templates

### Tertiary (LOW confidence)
- [Field Service Software Tips 2026](https://ezmanagement.com/tips-for-field-service-software-in-2026/) — Mobile-first, offline-capable requirements (general industry trends)

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
