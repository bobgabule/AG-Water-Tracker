# Architecture Patterns

**Domain:** Subscription tier management, role-based permission enforcement, login-only auth flow, and farm data isolation for offline-first agricultural water management PWA
**Researched:** 2026-02-22
**Confidence:** HIGH (based on direct codebase analysis of existing architecture)

## Recommended Architecture

### System Overview: v3.0 Integration Points

```
+------------------------------------------------------------------+
|                    CLIENT (Browser / PWA)                          |
+------------------------------------------------------------------+
|                                                                   |
|  AUTH FLOW (MODIFIED)                                             |
|  +----------------------------+  +----------------------------+   |
|  | PhonePage (keep)           |  | VerifyPage (keep)          |   |
|  | /auth/phone                |  | /auth/verify               |   |
|  +----------------------------+  +----------------------------+   |
|                                                                   |
|  NEW PAGE                                                         |
|  +----------------------------+                                   |
|  | NoSubscriptionPage         |   <-- user has no farm_member     |
|  | /no-subscription           |       row after OTP verification  |
|  +----------------------------+                                   |
|                                                                   |
|  MODIFIED PAGES                                                   |
|  +----------------------------+  +----------------------------+   |
|  | SubscriptionPage           |  | WellDetailPage             |   |
|  | (reads from DB tiers,      |  | (edit button hidden for    |   |
|  |  shows usage vs limits,    |  |  meter_checker role)       |   |
|  |  "Manage Plan" link)       |  |                            |   |
|  +----------------------------+  +----------------------------+   |
|                                                                   |
|  NEW HOOKS                                                        |
|  +----------------------------+  +----------------------------+   |
|  | useSubscriptionTier()      |  | useAppSettings()           |   |
|  | (reads subscription_tiers  |  | (reads app_settings from   |   |
|  |  + farms.subscription_tier |  |  PowerSync local DB)       |   |
|  |  from PowerSync local DB)  |  |                            |   |
|  +----------------------------+  +----------------------------+   |
|                                                                   |
|  MODIFIED                                                         |
|  +------------------------------------------------------+        |
|  | subscription.ts -- replace PLAN_LIMITS with hook      |        |
|  | useSeatUsage.ts -- read limits from useSubscriptionTier|       |
|  | permissions.ts -- add 'edit_well', 'manage_allocations'|       |
|  | RequireOnboarded.tsx -- simplified to farm check only  |        |
|  | WellDetailHeader.tsx -- conditionally show Edit button |        |
|  | WellAllocationsPage.tsx -- gate write actions          |        |
|  | App.tsx -- remove onboarding routes, add /no-subscription|     |
|  | AuthProvider.tsx -- simplify onboarding status          |       |
|  | powersync-schema.ts -- add subscription_tiers,         |       |
|  |                        app_settings tables              |       |
|  +------------------------------------------------------+        |
|                                                                   |
|  REMOVED                                                          |
|  +------------------------------------------------------+        |
|  | ProfilePage -- onboarding removed                     |        |
|  | CreateFarmPage -- onboarding removed                  |        |
|  | RequireNotOnboarded.tsx -- no longer needed            |        |
|  +------------------------------------------------------+        |
|                                                                   |
|  +------------------------------------------------------+        |
|  | PowerSync Local SQLite                                |        |
|  | [farms] [users] [farm_members] [farm_invites]         |        |
|  | [wells] [readings] [allocations]                      |        |
|  | [subscription_tiers*] [app_settings*]  (* = NEW)      |        |
|  +------------------------------------------------------+        |
+------------------------------------------------------------------+
           |
    Sync via WebSocket (bidirectional)
           |
+----------v-------------------------------------------------------+
|                    POWERSYNC SERVICE                               |
|  Sync Rules (updated):                                            |
|  - subscription_tiers: global bucket (all users)                  |
|  - app_settings: global bucket (all users)                        |
|  - (existing buckets unchanged)                                   |
+----------+-------------------------------------------------------+
           |
+----------v-------------------------------------------------------+
|                    SUPABASE (PostgreSQL)                           |
|  Tables (NEW):                                                    |
|  - subscription_tiers (id, name, display_name,                    |
|      max_growers, max_admins, max_meter_checkers, max_wells,      |
|      features JSONB, created_at, updated_at)                      |
|  - app_settings (key TEXT PK, value TEXT,                          |
|      description TEXT, updated_at)                                 |
|                                                                   |
|  Columns (MODIFIED):                                              |
|  - farms.subscription_tier UUID -> subscription_tiers(id)         |
|                                                                   |
|  RLS (MODIFIED):                                                  |
|  - wells UPDATE/DELETE: restrict to grower/admin                  |
|  - allocations INSERT/UPDATE/DELETE: restrict to grower/admin     |
|  - subscription_tiers: SELECT for all authenticated               |
|  - app_settings: SELECT for all authenticated                     |
+------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Status |
|-----------|---------------|-------------------|--------|
| `NoSubscriptionPage` | Displays message for users without farm membership, link to subscription website | useAuth, useAppSettings | NEW |
| `SubscriptionPage` (modified) | Shows current tier, seat/well usage, "Manage Plan" link from app_settings | useSubscriptionTier, useSeatUsage, useAppSettings, useWells | MODIFIED |
| `WellDetailHeader` (modified) | Conditionally render Edit button based on role | useUserRole, hasPermission | MODIFIED |
| `WellAllocationsPage` (modified) | Gate create/edit/delete allocation actions by role | useUserRole, hasPermission | MODIFIED |
| `WellEditPage` (modified) | Redirect meter_checkers who navigate directly via URL | useUserRole, hasPermission | MODIFIED |
| `RequireOnboarded` (modified) | Simplified: only checks farm membership, redirects to /no-subscription | useAuth | MODIFIED |
| `AuthProvider` (modified) | Simplified onboarding: remove profile check, keep farm check | Supabase RPC | MODIFIED |
| `App.tsx` (modified) | Remove onboarding routes, add /no-subscription route | React Router | MODIFIED |
| `useSubscriptionTier()` | Query farm's tier + limits from PowerSync local DB | PowerSync useQuery | NEW |
| `useAppSettings()` | Query app_settings key/value pairs from PowerSync local DB | PowerSync useQuery | NEW |
| `subscription.ts` (modified) | Export types only, remove hardcoded PLAN_LIMITS | None | MODIFIED |
| `useSeatUsage.ts` (modified) | Read limits from useSubscriptionTier instead of PLAN_LIMITS | useSubscriptionTier | MODIFIED |
| `permissions.ts` (modified) | Add 'edit_well' and 'manage_allocations' actions | None | MODIFIED |

### Data Flow

#### Login-Only Auth Flow (New, Replaces Onboarding)

```
User opens app
    |
    v
RequireAuth checks session
    |
    +-- No session --> /auth/phone --> OTP --> /auth/verify
    |                                            |
    |                                            v
    |                                     verifyOtp() succeeds
    |                                            |
    |                                            v
    |                                  fetchOnboardingStatus() RPC
    |                                     (simplified: just farm check)
    |                                            |
    +-- Has session                              |
    |                                            |
    v                                            v
RequireOnboarded checks hasFarmMembership
    |
    +-- hasFarmMembership = true --> AppLayout --> Dashboard
    |
    +-- hasFarmMembership = false --> /no-subscription
                                      |
                                      v
                              NoSubscriptionPage
                              "No active subscription"
                              "Contact your administrator"
                              [Link to subscription website]
                              [Sign Out button]
```

**Key change:** The old flow was Phone -> OTP -> Profile -> Create Farm -> Dashboard. The new flow is Phone -> OTP -> farm check -> Dashboard or NoSubscription. Profile creation and farm creation are completely removed from the app.

#### Subscription Tier Resolution (New)

```
1. Supabase: farms table has subscription_tier FK
2. subscription_tiers table has the actual limits
3. PowerSync syncs both tables to local SQLite

Client-side resolution:
    useSubscriptionTier() hook
        |
        v
    PowerSync query: SELECT st.* FROM subscription_tiers st
                     JOIN farms f ON f.subscription_tier = st.id
                     WHERE f.id = ?
        |
        | (Note: PowerSync doesn't support JOINs in useQuery)
        | (Actual implementation: two queries composed in the hook)
        v
    Step 1: SELECT subscription_tier FROM farms WHERE id = ?
    Step 2: SELECT * FROM subscription_tiers WHERE id = ?
        |
        v
    Returns: { name, maxGrowerSeats, maxAdminSeats,
               maxMeterCheckerSeats, maxWells, features }
```

#### Permission Enforcement Points (Modified + New)

```
Layer 1: Route-level guards (existing RequireRole)
    |
    | /subscription --> RequireRole action="manage_farm"
    | /wells/:id/edit --> NEW: RequireRole action="edit_well"
    | /wells/:id/allocations --> RequireRole action="manage_allocations"
    |
    v
Layer 2: UI-level gating (existing hasPermission)
    |
    | WellDetailHeader: Edit button --> hasPermission(role, 'edit_well')
    | WellDetailSheet: "Manage Allocations" --> hasPermission(role, 'manage_allocations')
    | WellListPage: individual well actions --> hasPermission checks
    |
    v
Layer 3: Seat/well limit enforcement (existing useSeatUsage, modified)
    |
    | UsersPage: Invite button disabled when seats full
    | AddWellForm: disabled when well count >= tier.maxWells
    | NEW: limits read from DB tier, not hardcoded PLAN_LIMITS
    |
    v
Layer 4: RLS policies (server-side, existing + modified)
    |
    | wells UPDATE/DELETE: restrict to grower/admin farm_ids
    | allocations INSERT/UPDATE/DELETE: restrict to grower/admin farm_ids
    | subscription_tiers SELECT: all authenticated users
    | app_settings SELECT: all authenticated users
```

---

## New Database Tables

### subscription_tiers Table

```sql
CREATE TABLE subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,            -- 'basic', 'pro'
    display_name TEXT NOT NULL,           -- 'Basic', 'Pro'
    max_growers INTEGER NOT NULL DEFAULT 1,
    max_admins INTEGER NOT NULL DEFAULT 1,
    max_meter_checkers INTEGER NOT NULL DEFAULT 3,
    max_wells INTEGER NOT NULL DEFAULT 5,
    features JSONB NOT NULL DEFAULT '{}', -- extensible feature flags
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO subscription_tiers (name, display_name, max_growers, max_admins, max_meter_checkers, max_wells, features) VALUES
    ('basic', 'Basic', 1, 1, 3, 5, '{"reports": false}'),
    ('pro', 'Pro', 1, 3, 10, 10, '{"reports": true}');
```

**Design rationale:** Separate seat columns per role (not a generic JSONB seats object) because:
1. PowerSync queries on individual columns are straightforward
2. No JSON parsing needed client-side for the most common operation (checking a limit)
3. Each limit is independently queryable and indexable
4. The `features` JSONB column handles extensible flags that are checked less frequently

### app_settings Table

```sql
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO app_settings (key, value, description) VALUES
    ('subscription_website_url', 'https://example.com/pricing', 'URL for "Manage Plan" links'),
    ('support_email', 'support@example.com', 'Support contact email');
```

**Design rationale:** Key-value table rather than a single-row config table because:
1. Easy to add new settings without migrations
2. PowerSync can sync the whole table efficiently (small, rarely changes)
3. Individual settings can be queried by key
4. No schema changes needed for new configuration values

### farms Table Modification

```sql
ALTER TABLE farms ADD COLUMN subscription_tier UUID
    REFERENCES subscription_tiers(id)
    DEFAULT (SELECT id FROM subscription_tiers WHERE name = 'basic');
```

---

## PowerSync Schema Additions

### subscription_tiers Table (PowerSync)

```typescript
const subscription_tiers = new TableV2({
  name: column.text,
  display_name: column.text,
  max_growers: column.integer,
  max_admins: column.integer,
  max_meter_checkers: column.integer,
  max_wells: column.integer,
  features: column.text, // JSONB stored as TEXT in PowerSync, parse client-side
  created_at: column.text,
  updated_at: column.text,
});
```

### app_settings Table (PowerSync)

```typescript
const app_settings = new TableV2({
  // 'key' is the PK, mapped to 'id' via sync rules (SELECT key AS id, ...)
  value: column.text,
  description: column.text,
  updated_at: column.text,
});
```

### Schema Registration

```typescript
export const AppSchema = new Schema({
  farms,
  users,
  farm_members,
  farm_invites,
  wells,
  readings,
  allocations,
  subscription_tiers,   // NEW
  app_settings,         // NEW
});

export type SubscriptionTier = Database['subscription_tiers'];
export type AppSetting = Database['app_settings'];
```

### PowerSync Sync Rules (New Buckets)

```yaml
# Global config data -- synced to ALL authenticated users
# These tables are small (2-5 rows) and rarely change
global_config:
  parameters: SELECT request.user_id() as user_id
  data:
    - SELECT id, name, display_name, max_growers, max_admins, max_meter_checkers, max_wells, features, created_at, updated_at FROM subscription_tiers
    - SELECT key AS id, value, description, updated_at FROM app_settings
```

**Design rationale for global bucket:** subscription_tiers and app_settings are read-only config tables with very few rows. Every user needs them to enforce limits client-side. A single global bucket per user is simpler than farm-scoped buckets and avoids the need for users to have a farm membership to see config data (important for the /no-subscription page).

### farms Sync Rule Update

The existing `user_farms` bucket needs to include the new `subscription_tier` column:

```yaml
user_farms:
  parameters: SELECT farm_id FROM farm_members WHERE user_id = request.user_id()
  data:
    - SELECT id, name, street_address, city, state, zip_code, subscription_tier, created_at, updated_at FROM farms WHERE id = bucket.farm_id
```

### farms PowerSync Schema Update

```typescript
const farms = new TableV2({
  name: column.text,
  description: column.text,
  street_address: column.text,
  city: column.text,
  state: column.text,
  zip_code: column.text,
  subscription_tier: column.text,  // NEW: UUID as text, FK to subscription_tiers
  created_at: column.text,
  updated_at: column.text,
});
```

---

## New Hooks

### useSubscriptionTier()

```typescript
// hooks/useSubscriptionTier.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';

export interface TierLimits {
  name: string;
  displayName: string;
  maxGrowerSeats: number;
  maxAdminSeats: number;
  maxMeterCheckerSeats: number;
  maxWells: number;
  features: Record<string, boolean>;
}

interface FarmTierRow { subscription_tier: string }
interface TierRow {
  name: string;
  display_name: string;
  max_growers: number;
  max_admins: number;
  max_meter_checkers: number;
  max_wells: number;
  features: string;
}

export function useSubscriptionTier(): TierLimits | null {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;

  // Step 1: Get farm's tier ID
  const farmQuery = farmId
    ? 'SELECT subscription_tier FROM farms WHERE id = ?'
    : 'SELECT NULL WHERE 0';
  const { data: farmData } = useQuery<FarmTierRow>(farmQuery, farmId ? [farmId] : []);

  const tierId = useMemo(() => farmData?.[0]?.subscription_tier ?? null, [farmData]);

  // Step 2: Get tier details
  const tierQuery = tierId
    ? 'SELECT * FROM subscription_tiers WHERE id = ?'
    : 'SELECT NULL WHERE 0';
  const { data: tierData } = useQuery<TierRow>(tierQuery, tierId ? [tierId] : []);

  return useMemo(() => {
    if (!tierData || tierData.length === 0) return null;
    const row = tierData[0];
    let features: Record<string, boolean> = {};
    try { features = JSON.parse(row.features); } catch { /* default empty */ }
    return {
      name: row.name,
      displayName: row.display_name,
      maxGrowerSeats: row.max_growers,
      maxAdminSeats: row.max_admins,
      maxMeterCheckerSeats: row.max_meter_checkers,
      maxWells: row.max_wells,
      features,
    };
  }, [tierData]);
}
```

### useAppSettings()

```typescript
// hooks/useAppSettings.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface SettingRow { id: string; value: string }

export function useAppSettings(): Map<string, string> {
  const { data } = useQuery<SettingRow>('SELECT id, value FROM app_settings');

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data) {
      map.set(row.id, row.value);
    }
    return map;
  }, [data]);
}
```

---

## Modifications to Existing Components

### 1. permissions.ts -- Add New Actions

```typescript
export const ACTIONS = [
  'manage_farm',
  'manage_users',
  'manage_wells',
  'create_well',
  'edit_well',            // NEW: separate from create_well
  'delete_well',          // NEW: separate from manage_wells
  'manage_allocations',   // NEW: create/edit/delete allocations
  'record_reading',
  'view_wells',
  'view_members',
  'manage_invites',
  'cross_farm_access',
] as const;

export const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  super_admin: ALL_ACTIONS,
  grower: ALL_EXCEPT_CROSS_FARM,
  admin: new Set<Action>([
    'manage_users',
    'manage_wells',
    'create_well',
    'edit_well',            // admin CAN edit
    'delete_well',          // admin CAN delete
    'manage_allocations',   // admin CAN manage allocations
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

### 2. RequireOnboarded.tsx -- Simplify

The current component checks both `hasProfile` and `hasFarmMembership`. After removing registration:

- Remove the `hasProfile` check entirely (users are pre-registered by admins)
- Keep `hasFarmMembership` check
- Redirect to `/no-subscription` instead of `/onboarding/profile`

```
Before: !hasProfile -> /onboarding/profile
         !hasFarmMembership -> /onboarding/farm/create

After:  !hasFarmMembership -> /no-subscription
```

### 3. AuthProvider.tsx -- Simplify Onboarding

The `get_onboarding_status` RPC currently returns `has_profile` and `has_farm_membership`. After removing registration, simplify to just return farm membership status. The RPC itself can stay (backward compatible), but the client only needs to check `hasFarmMembership`.

The `OnboardingStatus` interface simplifies:

```typescript
export interface OnboardingStatus {
  hasFarmMembership: boolean;
  farmId: string | null;
  farmName: string | null;
  // hasProfile removed -- no longer checked
}
```

### 4. App.tsx -- Route Changes

```
REMOVE:
  /onboarding/profile
  /onboarding/farm
  /onboarding/farm/create
  RequireNotOnboarded guard

ADD:
  /no-subscription (outside AppLayout, inside RequireAuth)

ADD GUARDS:
  /wells/:id/edit --> RequireRole action="edit_well"
  /wells/:id/allocations --> RequireRole action="manage_allocations"
```

### 5. useSeatUsage.ts -- Dynamic Limits

Replace the hardcoded `PLAN_LIMITS` import with `useSubscriptionTier()`:

```typescript
export function useSeatUsage(): SeatUsage | null {
  const tier = useSubscriptionTier();
  // ... existing query logic ...

  return useMemo(() => {
    if (!tier) return null;

    function calcRole(role: string, limit: number): RoleSeatUsage {
      const members = memberCounts.get(role) ?? 0;
      const invites = inviteCounts.get(role) ?? 0;
      const used = members + invites;
      const available = Math.max(0, limit - used);
      const isFull = used >= limit;
      return { used, limit, available, isFull };
    }

    return {
      admin: calcRole('admin', tier.maxAdminSeats),
      meter_checker: calcRole('meter_checker', tier.maxMeterCheckerSeats),
    };
  }, [membersData, invitesData, tier]);
}
```

### 6. WellDetailHeader.tsx -- Conditional Edit Button

```typescript
// Add role check to conditionally render the Edit button
const role = useUserRole();
const canEdit = hasPermission(role, 'edit_well');

// In JSX: only render Edit button when canEdit is true
{canEdit && (
  <button onClick={onEdit} ...>
    <PencilSquareIcon className="w-4 h-4" />
    <span>Edit</span>
  </button>
)}
```

### 7. subscription.ts -- Remove Hardcoded Limits

The current `PLAN_LIMITS` constant is replaced by the `useSubscriptionTier()` hook. The file can be reduced to just type exports and the `EXEMPT_ROLES` constant:

```typescript
// Keep: types, EXEMPT_ROLES
// Remove: PLAN_LIMITS constant, isSeatLimited function
```

### 8. RLS Policy Changes

Tighten well and allocation write policies:

```sql
-- Wells: restrict UPDATE/DELETE to grower/admin (currently allows all members)
DROP POLICY "Members can update wells" ON wells;
DROP POLICY "Members can delete wells" ON wells;

CREATE POLICY "Grower and admin can update wells"
    ON wells FOR UPDATE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

CREATE POLICY "Grower and admin can delete wells"
    ON wells FOR DELETE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Allocations: restrict write operations to grower/admin (currently allows all members)
DROP POLICY "Members can create allocations" ON allocations;
DROP POLICY "Members can update allocations" ON allocations;
DROP POLICY "Members can delete allocations" ON allocations;

CREATE POLICY "Grower and admin can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_admin_farm_ids()));

CREATE POLICY "Grower and admin can update allocations"
    ON allocations FOR UPDATE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

CREATE POLICY "Grower and admin can delete allocations"
    ON allocations FOR DELETE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Config tables: read-only for all authenticated users
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subscription tiers"
    ON subscription_tiers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read app settings"
    ON app_settings FOR SELECT
    USING (auth.role() = 'authenticated');
```

---

## Files to Remove

| File | Reason |
|------|--------|
| `src/pages/onboarding/ProfilePage.tsx` | Registration removed from app |
| `src/pages/onboarding/CreateFarmPage.tsx` | Registration removed from app |
| `src/components/RequireNotOnboarded.tsx` | No onboarding flow to guard against |

---

## Patterns to Follow

### Pattern 1: Two-Query Hook Composition for Cross-Table Data

**What:** Since PowerSync useQuery does not support JOINs, compose two sequential queries in a single hook. First query resolves the FK, second query fetches the related row.
**When:** Any hook that needs data from two related tables (e.g., farms -> subscription_tiers).
**Example:**

```typescript
// Step 1: resolve FK
const { data: farmData } = useQuery('SELECT subscription_tier FROM farms WHERE id = ?', [farmId]);
const tierId = farmData?.[0]?.subscription_tier ?? null;

// Step 2: fetch related row (guarded by Step 1 result)
const tierQuery = tierId ? 'SELECT * FROM subscription_tiers WHERE id = ?' : 'SELECT NULL WHERE 0';
const { data: tierData } = useQuery(tierQuery, tierId ? [tierId] : []);
```

**Why:** This is the standard PowerSync pattern for cross-table data. Both queries are reactive -- if the farm's tier changes (via sync), the component re-renders automatically.

### Pattern 2: Global Config Tables with Read-Only Sync

**What:** Tables like `subscription_tiers` and `app_settings` are synced to all users via a global bucket but are never written to from the client. The PowerSync connector should NOT include these tables in `ALLOWED_TABLES`.
**When:** Any server-managed config data that the client needs to read.
**Example:**

```typescript
// ALLOWED_TABLES does NOT include 'subscription_tiers' or 'app_settings'
const ALLOWED_TABLES = new Set([
  'farms', 'users', 'farm_members', 'farm_invites',
  'wells', 'readings', 'allocations',
  // NOT: 'subscription_tiers', 'app_settings'
]);
```

**Why:** These tables are managed server-side (admin dashboard or Stripe webhooks). Including them in ALLOWED_TABLES would allow the client to upsert/delete config rows via the CRUD queue, which is a security risk.

### Pattern 3: Permission Checks at Multiple Layers

**What:** Enforce permissions at three layers: route guards, UI visibility, and RLS policies.
**When:** Any action that should be restricted by role.
**Example:**

```
Layer 1 (Route): <Route element={<RequireRole action="edit_well" />}>
Layer 2 (UI):    {hasPermission(role, 'edit_well') && <EditButton />}
Layer 3 (RLS):   wells UPDATE USING (farm_id IN (SELECT get_user_admin_farm_ids()))
```

**Why:** Defense in depth. Route guards prevent navigation. UI gating prevents confusion. RLS prevents data corruption even if client code is bypassed.

### Pattern 4: Redirect Instead of Onboarding for Missing Farm

**What:** Users without a farm membership see a static "No Subscription" page with a link to the subscription website, instead of being guided through farm creation.
**When:** User authenticates but has no `farm_members` row.
**Example:**

```typescript
// RequireOnboarded (simplified)
if (!onboardingStatus?.hasFarmMembership) {
  return <Navigate to="/no-subscription" replace />;
}
```

**Why:** Farm/subscription creation is moving to a separate landing page. The app becomes login-only. This is cleaner and avoids maintaining onboarding state machines.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Checking Subscription Limits via Supabase RPC at Write Time

**What:** Calling an RPC to check "can this farm add another well?" before every write.
**Why bad:** Fails offline. Adds latency. The user already has the tier data locally via PowerSync.
**Instead:** Check limits client-side using `useSubscriptionTier()` and `useWells()`. The local data is authoritative enough for the UI check. RLS policies provide server-side enforcement for malicious bypass.

### Anti-Pattern 2: Storing Tier Limits in farms Table Directly

**What:** Adding `max_wells`, `max_admins`, etc. columns directly to the `farms` table instead of using a separate `subscription_tiers` table.
**Why bad:** Can't update limits for all Basic farms at once. Have to update each farm individually. Duplication of data. No single source of truth for what "Basic" means.
**Instead:** Use the FK pattern: `farms.subscription_tier -> subscription_tiers.id`. Update the tier row once, all farms on that tier are updated.

### Anti-Pattern 3: Using localStorage for Tier/Limits Cache

**What:** Caching subscription tier data in localStorage as a backup when PowerSync is not available.
**Why bad:** PowerSync IS the offline cache. The data is already in the local SQLite database. Adding localStorage creates a second cache with no invalidation strategy.
**Instead:** Trust PowerSync. If the local DB doesn't have the tier data yet (first load, before initial sync), show a loading state.

### Anti-Pattern 4: Client-Side Only Permission Enforcement

**What:** Relying solely on `hasPermission()` and UI gating without matching RLS policies.
**Why bad:** A knowledgeable user could use the PowerSync local database to write operations that bypass UI checks. The `uploadData()` connector sends these to Supabase where RLS is the real gatekeeper.
**Instead:** Always pair client-side permission checks with matching RLS policies. The client-side checks are for UX (hide buttons, prevent navigation). RLS is for security.

### Anti-Pattern 5: Removing RequireOnboarded Entirely

**What:** Removing the RequireOnboarded guard since there is no onboarding flow.
**Why bad:** Users who authenticate via OTP but have no farm_members row (e.g., invited user whose invite expired, or a user whose farm membership was deleted) need to be redirected somewhere. Without RequireOnboarded, they'd see an empty dashboard.
**Instead:** Keep RequireOnboarded but simplify it to only check `hasFarmMembership`. Redirect to `/no-subscription`.

---

## Suggested Build Order

Based on dependency analysis, the recommended build sequence is:

### Phase 1: Database Foundation (No Client Changes)

1. Create `subscription_tiers` table + seed data
2. Create `app_settings` table + seed data
3. Add `farms.subscription_tier` column with FK + default
4. Tighten RLS policies on wells (UPDATE/DELETE -> grower/admin)
5. Tighten RLS policies on allocations (INSERT/UPDATE/DELETE -> grower/admin)
6. Add RLS policies for subscription_tiers and app_settings (read-only)

**Rationale:** All downstream client work depends on these tables existing. RLS changes are independent and can ship safely -- the current UI already only shows edit buttons to all users, but the server-side restriction is the safety net.

### Phase 2: PowerSync Integration (Schema + Sync Rules)

1. Add `subscription_tiers` and `app_settings` to `powersync-schema.ts`
2. Add `subscription_tier` column to `farms` in schema
3. Update PowerSync Dashboard sync rules (global_config bucket, farms column)
4. Verify sync works -- new tables appear in local SQLite

**Rationale:** Hooks in Phase 3 depend on data being available in PowerSync.

### Phase 3: Subscription Tier Hooks + Subscription Page

1. Create `useSubscriptionTier()` hook
2. Create `useAppSettings()` hook
3. Create `useWellCount()` hook (for well limit checking)
4. Modify `useSeatUsage.ts` to read from `useSubscriptionTier()` instead of hardcoded `PLAN_LIMITS`
5. Simplify `subscription.ts` (remove `PLAN_LIMITS`, keep types + `EXEMPT_ROLES`)
6. Rebuild `SubscriptionPage` to show tier from DB, usage stats, "Manage Plan" link

**Rationale:** These hooks are the bridge between the new DB tables and the UI. SubscriptionPage is a good validation target -- if it shows correct data, the hooks work.

### Phase 4: Permission Enforcement

1. Add new actions to `permissions.ts` (`edit_well`, `delete_well`, `manage_allocations`)
2. Update `PERMISSION_MATRIX` (meter_checker gets NONE of the new actions)
3. Add `RequireRole` guards on routes (`/wells/:id/edit`, `/wells/:id/allocations`)
4. Gate WellDetailHeader Edit button with `hasPermission(role, 'edit_well')`
5. Gate WellAllocationsPage write actions with `hasPermission(role, 'manage_allocations')`
6. Gate WellEditPage with redirect for unauthorized roles

**Rationale:** Depends on existing permission infrastructure. Pure UI + routing changes.

### Phase 5: Login-Only Auth Flow

1. Create `NoSubscriptionPage` component
2. Simplify `AuthProvider.tsx` (remove `hasProfile` from OnboardingStatus)
3. Simplify `RequireOnboarded.tsx` (remove profile check, redirect to /no-subscription)
4. Update `App.tsx` routes: remove onboarding routes, add /no-subscription
5. Delete `ProfilePage.tsx`, `CreateFarmPage.tsx`, `RequireNotOnboarded.tsx`
6. Clean up dead imports and references

**Rationale:** This is the most disruptive change (removes existing code paths). Do it last so the rest of the system is stable. The simplified RequireOnboarded redirects to /no-subscription, which depends on Phase 3's useAppSettings hook for the subscription website URL.

### Phase 6: Farm Data Isolation Verification

1. Audit all RLS policies for consistent farm_id filtering
2. Verify PowerSync sync rules match RLS policies
3. Verify super_admin cross-farm bypass is consistent across all tables
4. Test: meter_checker cannot edit wells or allocations (UI + RLS)
5. Test: user without farm membership sees NoSubscriptionPage
6. Test: changing a farm's tier updates limits in the app

**Rationale:** Verification phase. All features must be built before comprehensive testing.

---

## Scalability Considerations

| Concern | Current (5-10 farms) | At 100 farms | At 1000 farms |
|---------|-------------------|-----------|-----------|
| subscription_tiers rows | 2-3 rows. Trivial. | Same 2-3 rows. Global. | Same. No per-farm growth. |
| app_settings rows | 2-5 rows. Trivial. | Same. Global. | Same. No per-farm growth. |
| farms.subscription_tier FK | Instant lookup. | Index lookup. Fine. | Index lookup. Fine. |
| Permission checks | In-memory Set.has(). O(1). | Same. No scaling concern. | Same. |
| Tier limit enforcement | 2 PowerSync queries. Instant. | Same per-user. | Same per-user. |

---

## Sources

- Direct codebase analysis of all files listed in this document -- HIGH confidence
- `src/lib/permissions.ts`: Current role + action definitions -- HIGH confidence
- `src/lib/subscription.ts`: Current hardcoded PLAN_LIMITS -- HIGH confidence
- `src/hooks/useSeatUsage.ts`: Current seat counting logic -- HIGH confidence
- `src/lib/AuthProvider.tsx`: Current onboarding status flow -- HIGH confidence
- `src/components/RequireOnboarded.tsx`: Current onboarding guard -- HIGH confidence
- `src/components/RequireNotOnboarded.tsx`: Current inverse guard -- HIGH confidence
- `src/components/RequireRole.tsx`: Current role guard pattern -- HIGH confidence
- `src/components/AppLayout.tsx`: PowerSyncProvider wrapping pattern -- HIGH confidence
- `src/lib/powersync-schema.ts`: Current PowerSync schema -- HIGH confidence
- `src/lib/powersync-connector.ts`: Current ALLOWED_TABLES and upload logic -- HIGH confidence
- `docs/powersync-sync-rules.yaml`: Current sync bucket definitions -- HIGH confidence
- `supabase/migrations/031_create_readings_and_allocations.sql`: RLS policy patterns (get_user_farm_ids, get_user_admin_farm_ids) -- HIGH confidence
- `supabase/migrations/032_well_edit_allocation_schema.sql`: Current relaxed RLS policies that need tightening -- HIGH confidence
- `.planning/PROJECT.md`: v3.0 milestone requirements -- HIGH confidence

---
*Architecture research for: Subscription tiers, role permissions, login-only auth flow, farm data isolation*
*Researched: 2026-02-22*
