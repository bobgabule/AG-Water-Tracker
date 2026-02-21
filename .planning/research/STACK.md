# Technology Stack

**Project:** AG Water Tracker v3.0 -- Subscriptions & Permissions
**Researched:** 2026-02-22
**Overall confidence:** HIGH

## TL;DR: No New Libraries Required

This milestone is a **code-and-schema** change, not a stack change. The existing stack (PowerSync, Supabase, React, Zustand) already provides everything needed for subscription tier management, role permission enforcement, and login-only auth simplification. Zero npm installs.

---

## Existing Stack (Unchanged)

These technologies are already in production and are NOT part of this research. Listed for compatibility reference only.

| Technology | Installed Version | Purpose |
|------------|-------------------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 6.4.1 | Build tool |
| Tailwind CSS | 4.1.18 | Styling (CSS-first config) |
| `@powersync/web` | 1.32.0 | Offline-first SQLite sync |
| `@powersync/react` | 1.8.2 | React bindings for PowerSync |
| `@supabase/supabase-js` | 2.93.3 | Supabase client (auth + RPC + CRUD) |
| Mapbox GL JS | 3.18.1 | Maps |
| react-map-gl | 8.1.0 | React Mapbox wrapper |
| Headless UI | 2.2.9 | Accessible UI primitives |
| Heroicons | 2.2.0 | Icons |
| React Router | 7.13.0 | Routing + route guards |
| vite-plugin-pwa | 1.2.0 | PWA support |
| Zustand | 5.0.11 | UI state |
| react-error-boundary | 6.1.0 | Error boundaries |

---

## Recommended Stack: Zero New Dependencies

### Why No New Packages

Every feature in v3.0 maps to an existing capability:

| v3.0 Feature | Implementation Approach | Existing Capability |
|--------------|------------------------|---------------------|
| Subscription tiers DB table | Supabase migration + PowerSync global bucket | `@powersync/web` TableV2, `@supabase/supabase-js` |
| App settings DB table | Supabase migration + PowerSync global bucket | Same as above |
| Farm-to-tier linking | Add column to `farms` table, join in queries | `@powersync/react` `useQuery` |
| Tier-based seat limits | Replace hardcoded `PLAN_LIMITS` with PowerSync query | `useSeatUsage` hook pattern (existing) |
| Tier-based well limits | New hook querying well count vs tier limit | `useQuery` + `useMemo` pattern (existing) |
| Role permission gating | Extend existing permission matrix with new actions | `src/lib/permissions.ts` (106 lines, type-safe) |
| Route-level permission guards | Use existing `RequireRole` component | `src/components/RequireRole.tsx` (existing) |
| Component-level permission checks | Use existing `hasPermission()` function | `src/lib/permissions.ts` (existing) |
| Login-only auth flow | Remove onboarding pages, simplify route guards | `react-router` + `AuthProvider` (existing) |
| "No subscription" redirect page | New static React component | React (existing) |
| Subscription page with tier info | Extend existing `SubscriptionPage.tsx` | `@powersync/react` `useQuery` (existing) |

**Confidence: HIGH** -- Every integration point verified against the actual codebase.

---

## Feature-by-Feature Implementation Strategy

### 1. Subscription Tiers: DB Config Tables Synced via PowerSync

**Current state:** Hardcoded `PLAN_LIMITS` constant in `src/lib/subscription.ts` defines a single "Basic" plan with fixed seat counts (`admin: 1`, `meter_checker: 3`). No well limits. No tier selection per farm.

**Target state:** Database-driven tiers synced to all clients via PowerSync global buckets. Each farm links to a tier. Limits are read from the synced local SQLite.

#### Supabase Migrations (SQL)

**New table: `subscription_tiers`**
```sql
CREATE TABLE subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,          -- 'Basic', 'Pro'
    max_wells INTEGER NOT NULL,         -- 5, 10
    max_admins INTEGER NOT NULL,        -- 1, 2
    max_meter_checkers INTEGER NOT NULL, -- 3, 5
    max_growers INTEGER NOT NULL DEFAULT 1, -- Always 1 grower per farm
    description TEXT,                   -- Plan description for UI
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed tiers
INSERT INTO subscription_tiers (name, max_wells, max_admins, max_meter_checkers, description) VALUES
  ('Basic', 5, 1, 3, 'Up to 5 wells, 1 admin, 3 meter checkers'),
  ('Pro', 10, 2, 5, 'Up to 10 wells, 2 admins, 5 meter checkers');
```

**New table: `app_settings`**
```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,           -- 'subscription_website_url', etc.
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial settings
INSERT INTO app_settings (key, value) VALUES
  ('subscription_website_url', 'https://example.com/pricing');
```

**Alter existing `farms` table:**
```sql
ALTER TABLE farms ADD COLUMN subscription_tier_id UUID
  REFERENCES subscription_tiers(id) DEFAULT (
    SELECT id FROM subscription_tiers WHERE name = 'Basic' LIMIT 1
  );
```

**RLS policies (SELECT-only for config tables):**
```sql
-- Authenticated users can read tiers (synced to all clients)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read subscription tiers"
  ON subscription_tiers FOR SELECT TO authenticated USING (true);

-- Authenticated users can read app settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read app settings"
  ON app_settings FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies = only service_role can modify
```

#### PowerSync Dashboard (Sync Rules)

**Two new global buckets** (no parameter query = syncs to ALL clients):

```yaml
bucket_definitions:
  global_subscription_tiers:
    data:
      - SELECT id, name, max_wells, max_admins, max_meter_checkers,
               max_growers, description, is_active, created_at, updated_at
        FROM subscription_tiers
        WHERE is_active = true

  global_app_settings:
    data:
      - SELECT id, key, value, created_at, updated_at
        FROM app_settings
```

**Update existing farm bucket** to include `subscription_tier_id` in the SELECT column list.

**Confidence: HIGH** -- PowerSync docs explicitly state: "If no Parameter Query is specified in the bucket definition, the bucket is automatically a global bucket. These buckets will be synced to all clients/users."

#### PowerSync Client Schema (`powersync-schema.ts`)

```typescript
const subscription_tiers = new TableV2({
  name: column.text,
  max_wells: column.integer,
  max_admins: column.integer,
  max_meter_checkers: column.integer,
  max_growers: column.integer,
  description: column.text,
  is_active: column.integer,    // 0/1 (PowerSync no BOOLEAN)
  created_at: column.text,
  updated_at: column.text,
});

const app_settings = new TableV2({
  key: column.text,
  value: column.text,
  created_at: column.text,
  updated_at: column.text,
});
```

Add `subscription_tier_id: column.text` to the existing `farms` TableV2 definition.

Register both in the Schema:
```typescript
export const AppSchema = new Schema({
  farms,
  users,
  farm_members,
  farm_invites,
  wells,
  readings,
  allocations,
  subscription_tiers,  // NEW
  app_settings,        // NEW
});
```

#### Connector: Read-Only by Omission

The existing `ALLOWED_TABLES` set in `powersync-connector.ts` controls which tables get uploaded:

```typescript
const ALLOWED_TABLES = new Set([
  'farms', 'users', 'farm_members', 'farm_invites',
  'wells', 'readings', 'allocations'
]);
// subscription_tiers and app_settings are NOT listed
// = any accidental local writes are silently dropped during upload
```

Do NOT add `subscription_tiers` or `app_settings` to this set. This is the established pattern for read-only tables in this codebase -- no SDK flags or special configuration needed.

**Confidence: HIGH** -- Verified by reading `powersync-connector.ts` line 9. The `applyOperation` method skips tables not in `ALLOWED_TABLES` (line 116-118).

#### React Hooks

Replace `src/lib/subscription.ts` (hardcoded) with a query-based approach:

```typescript
// New: src/hooks/useSubscriptionTier.ts
// Queries subscription_tiers via farms.subscription_tier_id
// Returns the tier limits for the current farm
// Falls back to Basic-tier defaults if query returns no rows (offline cold start edge case)
```

Update `useSeatUsage.ts` to read limits from `useSubscriptionTier()` instead of `PLAN_LIMITS`.

Add new `useWellLimitUsage()` hook for well count enforcement.

---

### 2. Role Permission Enforcement in React UI

**Current state:** `src/lib/permissions.ts` defines 9 actions: `manage_farm`, `manage_users`, `manage_wells`, `create_well`, `record_reading`, `view_wells`, `view_members`, `manage_invites`, `cross_farm_access`. The `RequireRole` route guard and `hasPermission()` function are used throughout the app.

**What needs to change:** The existing `manage_wells` action is too coarse. The requirements call for:
- Well edit/delete: gated to grower and admin only (meter_checker excluded)
- Allocation management: gated to grower and admin only
- Well detail edit button: hidden for meter_checkers

**Implementation approach -- extend the existing matrix:**

Add new fine-grained actions:
```typescript
export const ACTIONS = [
  'manage_farm',
  'manage_users',
  'manage_wells',
  'create_well',
  'edit_well',            // NEW
  'delete_well',          // NEW
  'manage_allocations',   // NEW
  'record_reading',
  'view_wells',
  'view_members',
  'manage_invites',
  'cross_farm_access',
] as const;
```

Update the permission matrix:
```typescript
export const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  super_admin: ALL_ACTIONS,
  grower: ALL_EXCEPT_CROSS_FARM,
  admin: new Set<Action>([
    'manage_users',
    'manage_wells',
    'create_well',
    'edit_well',            // NEW
    'delete_well',          // NEW
    'manage_allocations',   // NEW
    'record_reading',
    'view_wells',
    'view_members',
    'manage_invites',
  ]),
  meter_checker: new Set<Action>([
    'record_reading',
    'view_wells',
    'view_members',
    // NO edit_well, delete_well, manage_allocations
  ]),
};
```

**UI gating patterns (all existing, no new components):**

Route-level gating:
```tsx
<Route element={<RequireRole action="edit_well" />}>
  <Route path="/wells/:id/edit" element={<WellEditPage />} />
</Route>
<Route element={<RequireRole action="manage_allocations" />}>
  <Route path="/wells/:id/allocations" element={<WellAllocationsPage />} />
</Route>
```

Component-level gating (hide edit button for meter_checkers):
```tsx
{hasPermission(role, 'edit_well') && (
  <button onClick={onEdit}>Edit Well</button>
)}
```

**No new libraries.** The existing system is 106 lines, fully typed, and designed for exactly this kind of extension.

**Confidence: HIGH** -- The pattern is proven across v1.0 and v2.0 with 9 actions already working.

---

### 3. Login-Only Auth Flow (Remove Registration)

**Current state:**
- `resolveNextRoute()` has 3 states: no profile -> `/onboarding/profile`, no farm -> `/onboarding/farm/create`, complete -> dashboard
- `RequireOnboarded` checks `hasProfile` and `hasFarmMembership`
- `RequireNotOnboarded` prevents already-onboarded users from hitting onboarding routes
- `ProfilePage.tsx` and `CreateFarmPage.tsx` handle self-service registration

**Target state:**
- Login-only: Phone OTP -> farm check -> dashboard or "no subscription" page
- No in-app registration. Users are pre-created via invite system (already built in v1.0)
- Farm creation handled externally (admin tooling or future landing page)

**Files to remove entirely:**
- `src/pages/onboarding/ProfilePage.tsx`
- `src/pages/onboarding/CreateFarmPage.tsx`
- `src/components/RequireNotOnboarded.tsx` (or equivalent guard)

**Files to simplify:**

`src/lib/resolveNextRoute.ts` -- Two states only:
```typescript
export function resolveNextRoute(status: OnboardingStatus | null): string {
  if (!status) return '/auth/phone';
  if (!status.hasFarmMembership) return '/no-subscription';
  return '/app/dashboard';
}
```

`src/components/RequireOnboarded.tsx` -- Remove profile check branch:
- Remove the `if (!onboardingStatus.hasProfile)` redirect to `/onboarding/profile`
- Change the `if (!onboardingStatus.hasFarmMembership)` redirect from `/onboarding/farm/create` to `/no-subscription`

`src/App.tsx` -- Remove onboarding routes:
```tsx
// REMOVE:
// <Route element={<RequireNotOnboarded />}>
//   <Route path="/onboarding/profile" element={<ProfilePage />} />
//   <Route path="/onboarding/farm/create" element={<CreateFarmPage />} />
// </Route>

// ADD:
<Route path="/no-subscription" element={<NoSubscriptionPage />} />
```

**New file: `src/pages/NoSubscriptionPage.tsx`**
- Static page explaining user does not have an active subscription
- Shows "Contact your farm administrator" or links to subscription website URL from `app_settings`
- Route: `/no-subscription` (outside `AppLayout`, does not need PowerSync)
- Pattern: Simple React component with Tailwind styling, matching existing page style

**AuthProvider changes:** Minimal. The `OnboardingStatus` interface keeps `hasProfile` for backward compatibility with the Supabase RPC `get_onboarding_status`, but the client simply stops checking it for routing decisions.

**No new libraries needed.** This is purely code removal and simplification.

**Confidence: HIGH** -- Straightforward refactoring of existing patterns. No new capabilities required.

---

## What NOT to Add

| Library/Tool | Why Not | What to Do Instead |
|--------------|---------|-------------------|
| `@stripe/stripe-js` | Explicitly out of scope per PROJECT.md: "No Stripe yet" | Enforce limits in UI/DB only. "Manage Plan" button links to external URL from `app_settings` |
| TanStack Query / React Query | PowerSync `useQuery` already provides reactive, offline-capable data queries. Adding another query layer creates confusion and duplicate caches | Use `useQuery` from `@powersync/react` for all synced data |
| Zustand store for subscription data | Subscription tier data lives in PowerSync (synced SQLite). Creating a Zustand store duplicates state and creates sync issues | Query PowerSync directly via hooks |
| CASL / `@casl/react` / any RBAC library | The existing `permissions.ts` is 106 lines, type-safe, and perfectly fitted to 4 roles with ~12 actions. A library adds abstraction layers for zero benefit | Extend the existing permission matrix (add 3 new actions) |
| Feature flag library (LaunchDarkly, Flagsmith, etc.) | Subscription tiers in DB already serve as feature flags per farm. No need for a separate system | Tier-based gating via PowerSync queries |
| Form validation library (Zod, Yup, Valibot) | No new complex forms in this milestone. The subscription page is read-only display. The "no subscription" page is static | Keep existing validation patterns |
| Additional auth library | Supabase Auth handles everything needed. Phone OTP flow is working. Login-only simplifies, not adds | Keep `@supabase/supabase-js` auth |
| Admin panel library (react-admin, Retool SDK) | Tier management is done via Supabase Dashboard or SQL migrations, not in-app. Super admin is a future consideration | Direct database management via Supabase Dashboard |

---

## Alternatives Considered

| Decision | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Config table sync | PowerSync global buckets | Supabase RPC on-demand fetch | Global buckets sync once and are available offline. RPC requires network, fails offline. Config data changes rarely = perfect for sync-once pattern |
| Config table sync | PowerSync global buckets | Environment variables / hardcoded constants | Cannot update without code deploy. DB-driven = updatable via Supabase Dashboard |
| Read-only enforcement | Connector ALLOWED_TABLES omission | PowerSync `insertOnly` or `localOnly` TableV2 options | `insertOnly` allows local writes to upload queue (wrong direction). `localOnly` prevents sync entirely (wrong -- we want sync DOWN). Omitting from ALLOWED_TABLES is simpler and already the established pattern |
| Permission system | Extend existing matrix | Replace with CASL library | Existing system is simple, typed, and works. CASL adds ~15KB and an abstraction layer for a 4-role, 12-action system that fits in a single file |
| Tier data shape | Flat columns on `subscription_tiers` | JSON blob with limits | Flat columns are queryable in PowerSync SQLite. JSON blobs require client-side parsing, cannot be filtered in SQL, and are harder to validate |
| Subscription page | Extend existing SubscriptionPage | New dedicated TierManagement component | The existing page already shows seat usage. Adding tier info and well usage is an extension, not a replacement |

---

## Version Compatibility

All installed packages are verified compatible with planned changes:

| Package | Installed | Required Features | Compatible |
|---------|-----------|-------------------|------------|
| `@powersync/web` | 1.32.0 | `TableV2`, `Schema`, `column` types | Yes -- all used since v1.0 |
| `@powersync/react` | 1.8.2 | `useQuery`, `useStatus` | Yes -- all used since v1.0 |
| `@supabase/supabase-js` | 2.93.3 | Auth OTP, RPC calls, table operations | Yes -- all used since v1.0 |
| `react-router` | 7.13.0 | `Routes`, `Route`, `Navigate`, `Outlet` | Yes -- all used since v1.0 |

No version bumps required. No new packages to install.

**Confidence: MEDIUM** -- Installed versions verified via `npm list`. Latest available versions could not be confirmed (npm registry returned 403). However, installed versions are from 2025-2026 and include all required features.

---

## Installation

```bash
# No new dependencies for this milestone
# Zero npm install commands needed
```

---

## Migration Checklist

All changes are code and schema, not stack:

1. **Supabase migrations** -- `subscription_tiers` table, `app_settings` table, `farms.subscription_tier_id` column, RLS policies, seed data
2. **PowerSync Dashboard** -- Two new global buckets, updated farm bucket SELECT
3. **PowerSync schema** -- Two new TableV2 definitions, one new column on farms
4. **Connector** -- No changes (config tables intentionally omitted from ALLOWED_TABLES)
5. **Permission matrix** -- Add `edit_well`, `delete_well`, `manage_allocations` actions
6. **Hooks** -- New `useSubscriptionTier`, updated `useSeatUsage`, new `useWellLimitUsage`
7. **Routes** -- Remove onboarding routes, add `/no-subscription` route
8. **Pages** -- Remove `ProfilePage`, `CreateFarmPage`; add `NoSubscriptionPage`; update `SubscriptionPage`
9. **Guards** -- Simplify `RequireOnboarded`, remove `RequireNotOnboarded`
10. **Auth** -- Simplify `resolveNextRoute` to two-state logic

---

## Sources

- [PowerSync Sync Rules -- Global Buckets](https://docs.powersync.com/usage/sync-rules) -- "If no Parameter Query is specified, the bucket is automatically a global bucket synced to all clients" (HIGH confidence, official docs)
- [PowerSync TableV2 API Reference](https://powersync-ja.github.io/powersync-js/web-sdk/classes/TableV2) -- Constructor options, `localOnly`, `insertOnly` static factories (HIGH confidence, official SDK docs)
- [PowerSync Client Architecture](https://docs.powersync.com/architecture/client-architecture) -- Upload queue processes via connector's `uploadData` (HIGH confidence, official docs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- SELECT-only policies for read-only tables (HIGH confidence, official docs)
- [PowerSync January 2026 Changelog](https://www.powersync.com/blog/powersync-changelog-january-2026) -- Latest SDK features, deprecations, version info (MEDIUM confidence, official blog)
- [PowerSync JS Web Client SDK Releases](https://releases.powersync.com/announcements/powersync-js-web-client-sdk) -- v1.29.1+ release notes (MEDIUM confidence)
- Codebase analysis of: `src/lib/permissions.ts`, `src/lib/subscription.ts`, `src/lib/powersync-connector.ts`, `src/lib/powersync-schema.ts`, `src/lib/AuthProvider.tsx`, `src/lib/resolveNextRoute.ts`, `src/App.tsx`, `src/hooks/useSeatUsage.ts`, `src/hooks/useUserRole.ts`, `src/components/RequireOnboarded.tsx`, `src/components/RequireRole.tsx`, `src/pages/SubscriptionPage.tsx` (HIGH confidence, direct source analysis)

---
*Stack research for: AG Water Tracker v3.0 -- Subscriptions & Permissions*
*Researched: 2026-02-22*
