# Feature Research

**Domain:** SaaS subscription tier management, role-based permission enforcement, and login-only auth flow for an offline-first agricultural water management PWA
**Researched:** 2026-02-22
**Confidence:** HIGH (features well-defined in PROJECT.md, codebase thoroughly analyzed, SaaS patterns well-established)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or insecure.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **DB-driven subscription tiers table** | Farms must have discoverable limits without hardcoded values. SaaS standard is config tables, not constants. | LOW | New `subscription_tiers` table with columns for well_limit, admin_seats, meter_checker_seats. Synced to app via PowerSync. Replaces hardcoded `PLAN_LIMITS` in `src/lib/subscription.ts`. |
| **Farm-to-tier linkage** | Each farm needs a tier reference so limits are per-farm, not global. | LOW | Add `subscription_tier` TEXT column to `farms` table (default 'basic'). FK or soft reference to `subscription_tiers.id`. PowerSync schema needs this column added. |
| **Well count enforcement per tier** | Growers expect to see how many wells they can create and be blocked at the limit. Basic: 5 wells, Pro: 10 wells. | MEDIUM | Enforce in UI (disable "New Well" button when at limit) AND in DB (RPC or trigger check on insert). Model after existing `useSeatUsage` pattern -- create parallel `useWellUsage` hook. |
| **Seat limit enforcement per tier (DB-driven)** | Role seats must be enforced consistently. Tier-specific limits replace current hardcoded values. Basic: 1 admin / 1 meter checker, Pro: 1 admin / 3 meter checkers. | MEDIUM | Current `useSeatUsage` hook reads from `PLAN_LIMITS` constant. Must be refactored to read from the synced `subscription_tiers` table instead. Backend RPC `invite_user_by_phone_impl` should also enforce seat limits. |
| **Meter checker cannot edit wells** | Field agents record readings, not manage well configuration. Every SaaS with RBAC hides actions users cannot perform. | LOW | `WellDetailPage` and `WellEditPage` currently have NO role checks. Hide Edit button for meter_checker. Redirect `/wells/:id/edit` for unauthorized roles. `permissions.ts` already defines `manage_wells` action that meter_checker lacks. |
| **Meter checker cannot manage allocations** | Allocation management is an admin/grower concern. Meter checkers should see allocations (read-only) but not create/edit/delete. | LOW | `WellAllocationsPage` has no role gating. Add `hasPermission(role, 'manage_wells')` check to hide create/edit/delete controls. Route guard not needed -- read-only view is fine for all roles. |
| **Meter checker cannot invite users** | User management is admin/grower territory. The existing `manage_invites` action already excludes meter_checker in the permission matrix. | LOW | `UsersPage` already renders the AddUserModal. Hide the "Add User" button for meter_checker. Backend RPC already checks role server-side, so this is a UI-only change. |
| **Login-only flow (remove registration)** | App becomes invite-only. Users who are not pre-registered must see a clear "no access" state, not a broken onboarding flow. | MEDIUM | Remove `ProfilePage`, `CreateFarmPage`, `RequireNotOnboarded`, and onboarding routes from `App.tsx`. Modify `RequireOnboarded` to redirect to "no subscription" page instead of onboarding when user lacks profile/farm. |
| **"No subscription" redirect page** | Users with valid Supabase auth but no `farm_member` record need a clear explanation, not a blank screen or cryptic error. | LOW | New simple page: "You don't have an active subscription. Contact your farm administrator or visit [website] to get started." Links to external subscription website URL from `app_settings`. |
| **app_settings config table** | Global app configuration (subscription website URL, support contact) should be DB-driven, not hardcoded. | LOW | New `app_settings` table with key/value pairs. Synced to all users via PowerSync (public bucket, no farm filtering). Small table, minimal sync overhead. |
| **Farm data isolation verification** | Multi-tenant SaaS demands verified data isolation. Each farm must only see its own data. Cross-farm leakage is a critical security bug. | MEDIUM | Audit all RLS policies on all tables (farms, users, farm_members, farm_invites, wells, readings, allocations). Verify PowerSync sync rules filter by farm_id. Verify super_admin cross-farm bypass is intentional and consistent across all tables. |
| **Subscription page shows tier-specific data** | Growers need to see their current plan, what it includes, and how to manage/upgrade. | LOW | Replace hardcoded "Basic Plan" text with tier data from synced `subscription_tiers` table. Add well usage count alongside existing seat usage. "Manage Plan" links to external URL from `app_settings`. |

### Differentiators (Competitive Advantage)

Features that add polish above baseline expectations for this milestone.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Offline-available tier limits** | Tier config syncs to local SQLite via PowerSync so limit enforcement works offline. No network needed to check if you can add a well or invite a user. | LOW | Natural consequence of the PowerSync architecture. Just add `subscription_tiers` and `app_settings` to sync rules. Competitors often require network for plan checks. |
| **Graceful limit-reached UX** | Instead of error messages after action, show proactive "You've reached your plan limit" with clear upgrade path. Contextual at the point of action (New Well button, Add User button). | LOW | Extend existing pattern from `AddUserModal` which already shows "All seats are filled" with upgrade prompt. Apply same pattern to well creation. |
| **Real-time tier changes via sync** | If a super_admin upgrades a farm's tier in the DB, PowerSync syncs the change to all farm members in near-real-time. No app restart needed. | LOW | PowerSync handles this automatically. The `farms.subscription_tier` change triggers sync, and the UI reads from local SQLite reactively via `useQuery`. |
| **Permission matrix as single source of truth** | Existing `permissions.ts` with typed actions and role sets means adding new permission checks is trivial and type-safe. Zero scattered role string comparisons. | LOW | Already built. Just need to USE `hasPermission()` consistently in the components that currently lack checks. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this milestone.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **In-app Stripe payment flow** | "Let users upgrade right in the app" | Massive complexity: Stripe SDK, webhooks, payment UI, error states, refunds, receipt handling. Explicitly out of scope per PROJECT.md. PWA Stripe integration has iOS/Android quirks with redirects. | External subscription website with Stripe Customer Portal. `app_settings` stores the URL. "Manage Plan" button opens external link. |
| **Dynamic permission rules (admin-configurable)** | "Let growers customize what meter checkers can do" | Over-engineers a 4-role system with fixed expectations. Introduces UI complexity for permission management. Creates offline conflict potential when permission changes sync. | Fixed permission matrix in code. Roles have clear, documented capabilities. Changes require a code release (which is fine for a 4-role system). |
| **Soft-delete subscription (grace period)** | "Don't immediately lock out users when subscription lapses" | Requires billing event tracking, grace period logic, partial access states. No billing integration exists yet. | Binary state: farm has a valid tier or it does not. When Stripe integration comes later, it can set `farms.subscription_tier` to null to trigger the "no subscription" redirect. |
| **Per-well permission assignment** | "Let meter checkers only see certain wells" | Massively increases sync rule complexity. PowerSync would need per-well buckets instead of per-farm. Defeats the simplicity of the current farm-scoped model. | All farm members see all farm wells. Matches physical reality -- field agents drive to whichever well needs a reading. |
| **Self-service registration (keep onboarding flow)** | "New users should be able to sign up themselves" | Registration moves to the landing page (separate project). Keeping dual flows (in-app + landing page) creates maintenance burden and UX confusion about where to sign up. | Remove in-app registration entirely. New growers register on the landing page (future). Meter checkers are always invited by growers via SMS. |
| **Fine-grained resource limits (per-reading quotas, per-allocation limits)** | "Limit how many readings per month by tier" | Readings are the core value of the app -- field agents recording data in the field. Limiting them defeats the purpose and creates frustration in low-connectivity scenarios where retries are common. | Only limit the structural resources (wells, seats) that define the tier. Readings and allocations are unlimited within those constraints. |
| **Tier-specific feature flags (reports for Pro only, etc.)** | "Differentiate tiers by features, not just limits" | Adds conditional rendering complexity throughout the app. Feature flags in an offline-first app create sync edge cases. The app is simple enough that feature segmentation is premature. | Differentiate tiers by resource limits only (wells, seats). All users get the same features. Simpler code, simpler support. Feature flags can be added later if market demands it. |

## Feature Dependencies

```
subscription_tiers DB table
    |
    +--requires--> farms.subscription_tier column
    |                  |
    |                  +--enables--> Well count enforcement (reads farm tier -> tier limits)
    |                  |
    |                  +--enables--> Seat count enforcement (reads farm tier -> tier limits)
    |                  |
    |                  +--enables--> Subscription page tier display
    |
    +--requires--> PowerSync schema update (new table in sync rules)
    |
    +--requires--> useTierLimits hook (replaces PLAN_LIMITS constant)

app_settings DB table
    |
    +--enables--> "No subscription" redirect page (reads subscription_website_url)
    |
    +--enables--> "Manage Plan" link on subscription page
    |
    +--requires--> PowerSync schema update (new table in sync rules)

Login-only flow
    |
    +--requires--> "No subscription" redirect page (must exist before removing onboarding)
    |
    +--requires--> app_settings table (for redirect URLs)
    |
    +--blocks--> ProfilePage removal (cannot remove until redirect exists)
    +--blocks--> CreateFarmPage removal
    +--blocks--> RequireNotOnboarded removal

Role permission enforcement (UI gating)
    |
    +--depends-on--> existing permissions.ts (already built)
    +--depends-on--> existing useUserRole hook (already built)
    |
    +--independent-of--> subscription tier work (can be done in parallel)

Farm data isolation verification
    |
    +--independent-of--> all other features (audit task, no code dependencies)
    +--should-run-after--> all DB schema changes are complete
```

### Dependency Notes

- **subscription_tiers requires farms.subscription_tier:** The tier lookup chain is: farm -> farm.subscription_tier -> subscription_tiers table -> limits. Both the column and reference table must exist for enforcement to work.
- **Login-only flow requires "no subscription" page:** Cannot remove onboarding routes until there is somewhere to redirect users who lack farm membership. Otherwise they hit a blank/error state.
- **Role permission enforcement is independent of subscription tiers:** These are orthogonal concerns. Permission checks use the existing role system, not the tier system. They can be implemented in any order or in parallel.
- **Farm data isolation audit should run last:** It validates the final state of all DB changes. Running it before schema changes are complete would require re-running.
- **useTierLimits hook replaces PLAN_LIMITS:** The existing `useSeatUsage` hook reads from `PLAN_LIMITS` constant. It must be refactored to read from the local SQLite subscription_tiers table. This is a breaking change that should happen atomically with the new table + sync rules to avoid a period where limits are missing.
- **app_settings enables both redirect and subscription page:** The external URL stored in app_settings is consumed by two features. Build the table first, then both consumers can reference it.

## MVP Definition

### This Milestone (v3.0 -- Subscriptions & Permissions)

Minimum viable set to ship. All items are P1.

- [ ] `subscription_tiers` table in Supabase with Basic and Pro tier rows -- foundation for all limit enforcement
- [ ] `app_settings` table in Supabase with `subscription_website_url` key -- needed for redirect page and manage plan links
- [ ] `farms.subscription_tier` column defaulting to 'basic' -- links each farm to its tier
- [ ] PowerSync schema + sync rules updated for new tables -- makes tier/settings data available offline
- [ ] `useTierLimits` hook replacing `PLAN_LIMITS` constant -- single reactive source of truth for tier limits
- [ ] Well count enforcement in UI -- disable "New Well" when at tier limit, show usage count
- [ ] Seat count enforcement refactored to use DB tiers -- replaces hardcoded `PLAN_LIMITS` seat limits
- [ ] Meter checker UI restrictions: hide well edit button, hide allocation create/edit/delete, hide invite button -- completes role enforcement
- [ ] Remove onboarding routes and components (ProfilePage, CreateFarmPage, RequireNotOnboarded) -- login-only app
- [ ] "No subscription" redirect page -- catches users without farm membership with clear messaging
- [ ] Updated RequireOnboarded guard -- redirects to no-subscription page instead of onboarding
- [ ] Updated subscription page showing tier-specific data and well usage -- replaces hardcoded "Basic Plan"
- [ ] Farm data isolation audit (RLS policies + PowerSync sync rules) -- verifies multi-tenant security

### Add After This Milestone (v3.x)

Features to add once core subscription system is working.

- [ ] Backend enforcement of well/seat limits in RPC functions -- currently frontend-only for seat limits, add DB-level checks in `invite_user_by_phone_impl` and well creation RPC
- [ ] Super admin tier management UI -- ability to change a farm's tier from a super admin view, currently requires direct DB edit
- [ ] Tier upgrade/downgrade handling -- define policy for when a farm downgrades and exceeds new limits (soft-block new additions vs. force removal)

### Future Consideration (v4+)

Features to defer until landing page and Stripe integration are built.

- [ ] Stripe Customer Portal integration -- webhook updates `farms.subscription_tier` on payment events
- [ ] Landing page with grower registration flow -- new growers sign up on www. subdomain
- [ ] Usage-based billing (per-well pricing) -- alternative to flat tier pricing
- [ ] Enterprise tier with custom limits -- requires admin UI for per-farm limit overrides
- [ ] Trial period with automatic downgrade -- requires billing event tracking and scheduling

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| subscription_tiers DB table + PowerSync sync | HIGH | LOW | P1 |
| app_settings DB table + PowerSync sync | MEDIUM | LOW | P1 |
| farms.subscription_tier column | HIGH | LOW | P1 |
| useTierLimits hook (replace PLAN_LIMITS) | HIGH | MEDIUM | P1 |
| Well count enforcement (UI) | HIGH | MEDIUM | P1 |
| Seat count enforcement (DB-driven refactor) | HIGH | LOW | P1 |
| Meter checker: hide well edit button | HIGH | LOW | P1 |
| Meter checker: hide allocation management controls | HIGH | LOW | P1 |
| Meter checker: hide invite/user management controls | MEDIUM | LOW | P1 |
| Login-only flow (remove onboarding) | HIGH | MEDIUM | P1 |
| "No subscription" redirect page | HIGH | LOW | P1 |
| Subscription page tier update | MEDIUM | LOW | P1 |
| Farm data isolation audit | HIGH | MEDIUM | P1 |
| Backend RPC limit enforcement (wells + seats) | MEDIUM | MEDIUM | P2 |
| Super admin tier management UI | LOW | MEDIUM | P3 |
| Tier upgrade/downgrade handling | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone (v3.0)
- P2: Should have, add in v3.x
- P3: Nice to have, future consideration

## Existing Code Inventory (What Is Already Built)

Understanding what exists is critical for accurate scoping. This milestone extends, not creates, the permission and subscription systems.

| Existing Asset | Location | How It Applies to v3.0 | Effort to Extend |
|----------------|----------|------------------------|------------------|
| Permission matrix (9 actions, 4 roles) | `src/lib/permissions.ts` | `manage_wells`, `manage_invites`, `record_reading` already defined. meter_checker already excluded from management actions. Just need to USE it in more components. | Minimal -- call `hasPermission()` |
| useUserRole hook | `src/hooks/useUserRole.ts` | Returns typed Role from farm_members via PowerSync. Works correctly. | None needed |
| RequireRole route guard | `src/components/RequireRole.tsx` | Can gate routes by action. Already used for `/subscription`. Can reuse for `/wells/:id/edit`. | None needed |
| useSeatUsage hook | `src/hooks/useSeatUsage.ts` | Pattern for counting resources against limits. Refactor from constant to DB-driven limits. | Medium -- swap limit source from `PLAN_LIMITS` to `useTierLimits()` |
| PLAN_LIMITS constant | `src/lib/subscription.ts` | Currently hardcoded Basic tier (admin: 1, meter_checker: 3). Must be replaced entirely with DB-driven hook. | Remove file, replace all imports |
| AddUserModal seat gating | `src/components/AddUserModal.tsx` | Already shows "All seats are filled" and disables submit. Proven pattern to reuse for well count limits. | Reuse pattern only |
| RequireOnboarded guard | `src/components/RequireOnboarded.tsx` | Currently redirects to `/onboarding/profile` and `/onboarding/farm/create`. Must redirect to `/no-subscription` page instead. | Medium -- change redirect logic in 2 branches |
| RequireNotOnboarded guard | `src/components/RequireNotOnboarded.tsx` | To be removed entirely -- no onboarding flow means no "already onboarded" guard needed. | Delete file + remove from App.tsx |
| ProfilePage | `src/pages/onboarding/ProfilePage.tsx` | To be removed entirely. | Delete file + clean imports |
| CreateFarmPage | `src/pages/onboarding/CreateFarmPage.tsx` | To be removed entirely. | Delete file + clean imports |
| SubscriptionPage | `src/pages/SubscriptionPage.tsx` | Shows seat usage with hardcoded plan name. Refactor to show tier from DB + add well count usage. | Medium |
| PowerSync schema | `src/lib/powersync-schema.ts` | Must add `subscription_tiers` and `app_settings` table definitions. `farms` table needs `subscription_tier` column. | Low -- add 2 new tables + 1 column |
| App.tsx routes | `src/App.tsx` | Remove onboarding routes (lines 42-48). Add `/no-subscription` route. Keep all protected routes. | Low-Medium |
| AuthProvider / onboardingStatus | `src/lib/AuthProvider.tsx` | `get_onboarding_status` RPC returns `hasProfile` and `hasFarmMembership`. The login-only flow changes how these are used but not the RPC itself. | Low -- consumer changes only |
| RLS policies | `supabase/migrations/011_new_rls_policies.sql` | Existing policies use `get_user_farm_ids()` and `get_user_admin_farm_ids()` helper functions. New tables need similar policies. Audit needed for completeness. | Medium -- new policies for new tables + audit |
| Custom Access Token Hook | `supabase/migrations/022_custom_access_token_hook.sql` | Embeds role in JWT for RLS. No changes needed for this milestone. | None needed |

## Detailed Feature Specifications

### subscription_tiers Table Design

```
subscription_tiers (
  id TEXT PRIMARY KEY,         -- 'basic', 'pro' (slug, not UUID)
  name TEXT NOT NULL,           -- 'Basic', 'Pro' (display name)
  well_limit INTEGER NOT NULL,  -- 5 for Basic, 10 for Pro
  admin_seats INTEGER NOT NULL, -- 1 for both
  meter_checker_seats INTEGER NOT NULL, -- 1 for Basic, 3 for Pro
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

Why TEXT primary key instead of UUID: These are stable reference values ('basic', 'pro'), not generated records. Simpler foreign key from `farms.subscription_tier`, more readable in queries, and matches the pattern of using slugs for config data.

### app_settings Table Design

```
app_settings (
  key TEXT PRIMARY KEY,        -- 'subscription_website_url', 'support_email', etc.
  value TEXT NOT NULL,          -- The setting value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

Initial rows:
- `subscription_website_url` = 'https://example.com/subscribe' (placeholder until landing page exists)
- `support_email` = 'support@example.com' (placeholder)

### "No Subscription" Page Behavior

**When shown:** User has valid Supabase session but:
- No `farm_member` record exists (user was never invited/assigned), OR
- User's farm has no `subscription_tier` (null -- subscription lapsed)

**Page content:**
- Clear heading: "No Active Subscription"
- Explanation: "Your account doesn't have access to a farm. If you were invited by a farm owner, ask them to send you a new invite."
- CTA: "Get Started" button linking to `subscription_website_url` from `app_settings`
- Secondary: "Sign Out" button to return to login screen

**Navigation:** No side menu, no header. Standalone page like the current auth pages.

### Login-Only Flow (After Onboarding Removal)

**Current flow:**
```
Phone OTP -> Verify -> RequireAuth -> RequireOnboarded
  -> hasProfile? No -> ProfilePage
  -> hasFarmMembership? No -> CreateFarmPage
  -> Yes -> Dashboard
```

**New flow:**
```
Phone OTP -> Verify -> RequireAuth -> RequireOnboarded
  -> hasFarmMembership? No -> /no-subscription page
  -> Yes -> Dashboard
```

Key simplifications:
- `hasProfile` check becomes irrelevant (profiles are created during invite acceptance, not self-service)
- `hasFarmMembership` is the only gate
- `RequireNotOnboarded` is deleted entirely
- All `/onboarding/*` routes are deleted

### Role Permission Enforcement Details

**Components requiring changes:**

| Component | Current State | Required Change |
|-----------|--------------|-----------------|
| `WellDetailPage.tsx` | No role check. Edit button always visible. | Conditionally render Edit button: `hasPermission(role, 'manage_wells')` |
| `WellEditPage.tsx` | No route guard. Anyone can navigate to `/wells/:id/edit`. | Add `RequireRole action="manage_wells"` wrapper in `App.tsx` routes, OR redirect in component if role lacks permission. |
| `WellAllocationsPage.tsx` | No role check. Create/Edit/Delete all visible. | Conditionally render mutation buttons: `hasPermission(role, 'manage_wells')`. Keep read-only view for all roles. |
| `UsersPage.tsx` | "Add User" button visibility unclear. | Conditionally render "Add User" button: `hasPermission(role, 'manage_invites')`. |
| `SideMenu.tsx` | All menu items visible to all roles. | Optionally hide "Users" menu item for meter_checker, or keep visible but with restricted actions on the page. |

## Sources

- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) -- JWT claims for role-based access
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- Pattern for embedding roles in JWT
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS enforcement patterns
- [Implementing RBAC in React (Permit.io)](https://www.permit.io/blog/implementing-react-rbac-authorization) -- Frontend RBAC patterns: enforce at backend, use frontend for UX only
- [Enterprise Ready RBAC Guide](https://www.enterpriseready.io/features/role-based-access-control/) -- SaaS RBAC best practices for role hierarchy and permission design
- [Entitlement Management for SaaS](https://verustrust-licensing.com/blog/entitlement-management-for-saas-guide/) -- Feature gating and subscription limit patterns
- [SaaS Subscription Tier Design (HubiFi)](https://www.hubifi.com/blog/saas-subscription-tiers-design) -- Tier design strategy and pricing model approaches
- [Modeling SaaS Subscriptions in Postgres](https://axellarsson.com/blog/modeling-saas-subscriptions-in-postgres/) -- DB schema patterns for subscription management
- [Farmbrite Plans & Pricing](https://farmbrite.com/plans-pricing) -- Competitor tier structure for farm management SaaS
- [RouteManager Meter Reading Software](https://www.alexander-co.com/software.php) -- Field agent role patterns for meter reading apps
- [Edwards Aquifer Authority Meter App](https://www.edwardsaquifer.org/groundwater-users/groundwater-use-reporting/meter-app/) -- Role-based meter management in water tracking
- Existing codebase analysis: `src/lib/permissions.ts`, `src/lib/subscription.ts`, `src/hooks/useSeatUsage.ts`, `src/components/RequireRole.tsx`, `src/components/RequireOnboarded.tsx`, `src/App.tsx`, all 32 migration files

---
*Feature research for: AG Water Tracker v3.0 -- Subscriptions & Permissions*
*Researched: 2026-02-22*
