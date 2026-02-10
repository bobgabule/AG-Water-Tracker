# Phase 4: Permission Enforcement - Research

**Researched:** 2026-02-11
**Domain:** Client-side route guards, role-based UI gating, super admin cross-farm access, role change detection
**Confidence:** HIGH

## Summary

Phase 4 enforces the permission system built in Phase 3 at the UI level. The codebase already has all the building blocks: `src/lib/permissions.ts` (centralized permission matrix with `hasPermission()`, `isAdminOrAbove()`), `src/hooks/useUserRole.ts` (queries `farm_members` via PowerSync), and JWT claims carrying `user_role` and `farm_id` in `app_metadata`. The Settings page already demonstrates the pattern -- it conditionally renders the Team Management section using `isAdminOrAbove(userRole)`. Phase 4 extends this pattern to route-level guards, navigation filtering, dashboard UI elements, and the super admin cross-farm access model.

The architecture is straightforward because this is entirely client-side work building on verified Phase 3 infrastructure. No new libraries are needed. The primary complexity lives in two areas: (1) the super admin cross-farm model (plan 04-03), which requires a farm selector mechanism and a way to override the "current farm" context for data queries, and (2) role change detection (plan 04-04), which requires monitoring the `farm_members` table via PowerSync reactive queries and triggering `disconnectAndClear()` when the role changes server-side.

**Primary recommendation:** Build a `RequireRole` route guard component first, then layer UI gating into navigation and pages, then tackle super admin cross-farm as a separate concern, then role change detection last.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Router v7 | 7.x | Route guards via wrapper components (`<Navigate>`, `<Outlet>`) | Already in use; wrapper pattern matches existing `RequireAuth`/`RequireOnboarded` |
| `@powersync/react` | Current | `useQuery` for reactive role monitoring | Already in use for all data queries |
| TypeScript | 5.x | Type-safe role/action checking | Already in use |
| `src/lib/permissions.ts` | N/A | `hasPermission()`, `isAdminOrAbove()`, `Role`, `Action` types | Phase 3 output, centralized permission checks |
| `src/hooks/useUserRole.ts` | N/A | `useUserRole()` returning `Role \| null` | Phase 3 output, reactive role from PowerSync |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Headless UI v2 | 2.x | Farm selector dropdown for super admin | Already in use for dialogs/modals |
| Heroicons | 2.x | Icons for UI elements | Already in use |
| Zustand v5 | 5.x | Optional: store for super admin's "active farm" override | Already available, currently unused (`src/stores/.gitkeep`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Wrapper component route guard | React Router v7 loader-based auth | Loaders require Data Mode (`createBrowserRouter`); app uses declarative `<Routes>` mode. Wrapper pattern matches existing `RequireAuth`/`RequireOnboarded`. |
| Zustand store for active farm | React Context for active farm | Zustand avoids re-render cascades; Context would cause full tree re-render on farm switch. Zustand already in project deps. |
| Component-level `hasPermission()` checks | HOC wrapper for each page | Direct `hasPermission()` calls are more explicit and flexible; HOCs add indirection. Existing SettingsPage pattern proves this works well. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  components/
    RequireRole.tsx          # NEW: Route guard wrapper component
    SideMenu.tsx             # MODIFY: Filter nav items by role
    FarmSelector.tsx         # NEW: Super admin farm selector dropdown
  hooks/
    useUserRole.ts           # EXISTS: Phase 3 output
    useRoleChangeDetector.ts # NEW: Monitors role changes, triggers disconnectAndClear
    useActiveFarm.ts         # NEW: Returns current active farm (own farm OR super admin override)
  lib/
    permissions.ts           # EXISTS: Phase 3 output, may add canAccessRoute() helper
  stores/
    activeFarmStore.ts       # NEW: Zustand store for super admin farm override
  pages/
    DashboardPage.tsx        # MODIFY: Gate "New Well" button by create_well permission
    SettingsPage.tsx          # EXISTS: Already gated with isAdminOrAbove()
    UsersPage.tsx            # NEW or future: Listed in requirements but doesn't exist yet
```

### Pattern 1: RequireRole Route Guard Component

**What:** A wrapper component that checks the user's role against required permissions and either renders children/`<Outlet>` or silently redirects to dashboard.
**When to use:** Wrap route groups that require specific permissions.
**Example:**
```typescript
// Source: Existing codebase pattern (RequireAuth.tsx, RequireOnboarded.tsx)
import { Navigate, Outlet } from 'react-router';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission } from '../lib/permissions';
import type { Action } from '../lib/permissions';

interface RequireRoleProps {
  /** Action required to access this route */
  action: Action;
  /** Where to redirect if unauthorized (default: '/') */
  fallbackPath?: string;
  children?: React.ReactNode;
}

export default function RequireRole({
  action,
  fallbackPath = '/',
  children,
}: RequireRoleProps) {
  const role = useUserRole();

  // Role still loading (PowerSync query in progress) - show nothing or spinner
  // This avoids a flash of redirect while role data is being fetched
  if (role === null) {
    return null; // or a loading spinner
  }

  if (!hasPermission(role, action)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
```

**Critical design decision:** The `role === null` case (loading state) needs careful handling. There are three scenarios where role is null: (1) PowerSync query is still loading, (2) user has no farm membership, (3) data not yet synced. Since `RequireOnboarded` already gates for farm membership, within the protected routes `null` should only mean "still loading." A brief null render (or spinner) avoids a false redirect. The `RequireOnboarded` guard already handles the "no farm membership" case upstream.

### Pattern 2: Role-Based Navigation Filtering

**What:** Filter the `navItems` array in `SideMenu.tsx` based on the user's role and permissions.
**When to use:** Navigation menus, action buttons, page sections.
**Example:**
```typescript
// Source: Codebase pattern (SideMenu.tsx current structure)
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission } from '../lib/permissions';
import type { Action } from '../lib/permissions';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  requiredAction?: Action; // undefined = visible to all roles
}

const navItems: NavItem[] = [
  { label: 'Map', icon: MapIcon, path: '/' },
  { label: 'Well List', icon: ListBulletIcon, path: '/wells' },
  { label: 'Reports', icon: ChartBarIcon, path: '/reports' },
  { label: 'Settings', icon: Cog6ToothIcon, path: '/settings', requiredAction: 'manage_farm' },
  // ...
];

// In component:
const role = useUserRole();
const visibleItems = navItems.filter(
  (item) => !item.requiredAction || hasPermission(role, item.requiredAction)
);
```

### Pattern 3: Super Admin Active Farm Override

**What:** A Zustand store that tracks which farm the super admin is currently viewing. All data-fetching hooks read from this store instead of directly from `onboardingStatus.farmId`.
**When to use:** Super admin cross-farm access only.
**Example:**
```typescript
// Source: Zustand v5 pattern, project convention
import { create } from 'zustand';

interface ActiveFarmState {
  /** Farm ID override set by super admin farm selector. Null = use own farm. */
  overrideFarmId: string | null;
  overrideFarmName: string | null;
  setActiveFarm: (farmId: string, farmName: string) => void;
  clearOverride: () => void;
}

export const useActiveFarmStore = create<ActiveFarmState>((set) => ({
  overrideFarmId: null,
  overrideFarmName: null,
  setActiveFarm: (farmId, farmName) =>
    set({ overrideFarmId: farmId, overrideFarmName: farmName }),
  clearOverride: () =>
    set({ overrideFarmId: null, overrideFarmName: null }),
}));
```

Then a `useActiveFarm()` hook would combine this with auth context:
```typescript
export function useActiveFarm(): { farmId: string | null; farmName: string | null } {
  const { onboardingStatus } = useAuth();
  const role = useUserRole();
  const overrideFarmId = useActiveFarmStore((s) => s.overrideFarmId);
  const overrideFarmName = useActiveFarmStore((s) => s.overrideFarmName);

  // Super admin with an override active
  if (role === 'super_admin' && overrideFarmId) {
    return { farmId: overrideFarmId, farmName: overrideFarmName };
  }

  // Default: own farm
  return {
    farmId: onboardingStatus?.farmId ?? null,
    farmName: onboardingStatus?.farmName ?? null,
  };
}
```

### Pattern 4: Role Change Detection via Reactive Query

**What:** A hook that monitors the user's role via PowerSync reactive queries and detects when it changes.
**When to use:** Always active inside the `AppLayout`, detects server-side role changes on next sync.
**Example:**
```typescript
// Source: PowerSync reactive query pattern, project convention
import { useEffect, useRef } from 'react';
import { useUserRole } from './useUserRole';
import { disconnectAndClear } from '../lib/powersync';
import type { Role } from '../lib/permissions';

export function useRoleChangeDetector() {
  const role = useUserRole();
  const prevRoleRef = useRef<Role | null | undefined>(undefined);

  useEffect(() => {
    // Skip initial mount (prevRole is undefined)
    if (prevRoleRef.current === undefined) {
      prevRoleRef.current = role;
      return;
    }

    // Role changed from a known value to a different known value
    if (prevRoleRef.current !== null && role !== null && prevRoleRef.current !== role) {
      // Role changed server-side, clear local data and re-sync
      disconnectAndClear().then(() => {
        // After clear, PowerSync will reconnect with fresh data
        // matching new role's sync rule buckets
        window.location.reload();
      });
    }

    prevRoleRef.current = role;
  }, [role]);
}
```

### Pattern 5: Client-Side Write Guards

**What:** Check permissions before executing PowerSync write operations to prevent offline writes that RLS will reject on sync.
**When to use:** Any component that performs INSERT/UPDATE/DELETE operations.
**Example:**
```typescript
// In DashboardPage.tsx handleSaveWell:
const role = useUserRole();

const handleSaveWell = useCallback(async (wellData: WellFormData) => {
  if (!hasPermission(role, 'create_well')) {
    // This shouldn't happen if UI gating works, but defense in depth
    debugError('Dashboard', 'Attempted well creation without permission');
    return;
  }
  // ... existing save logic
}, [role, /* ... */]);
```

### Anti-Patterns to Avoid

- **Checking role strings directly in components:** Never write `if (role === 'admin')`. Always use `hasPermission(role, action)` or `isAdminOrAbove(role)` from `permissions.ts`. This was established in Phase 3 and SettingsPage already follows this pattern.
- **Redirecting with error messages for unauthorized routes:** Success criterion 4 explicitly states "redirects to dashboard with no error." Use `<Navigate to="/" replace />` silently.
- **Rendering restricted content then hiding it:** Don't render admin UI and hide with CSS. Use conditional rendering (`{canManage && <Section />}`) to avoid DOM exposure and screen reader leakage.
- **Hardcoding farm_id in super admin queries:** Always use the `useActiveFarm()` hook which respects the override store. Never read `onboardingStatus.farmId` directly in data-fetching hooks after this phase.
- **Triggering disconnectAndClear on initial mount:** The role change detector must distinguish between "initial load" and "actual role change." Use a ref to track previous role and skip the first render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route protection | Custom middleware or loader-based auth | Wrapper component pattern (matches `RequireAuth`/`RequireOnboarded`) | Existing pattern is proven, consistent, and works with declarative `<Routes>` |
| Permission checking | Inline role string comparisons | `hasPermission()` from `permissions.ts` | Single source of truth, already enforced in Phase 3 |
| Navigation filtering | Multiple `if` blocks per menu item | `requiredAction` property on nav item config | Declarative, scalable, testable |
| Farm list for super admin | Custom RPC + manual state | PowerSync query on `farms` table + Zustand store | Data already syncs via PowerSync buckets for the user's memberships |
| Role change detection | Polling interval or manual refresh | PowerSync reactive query (`useQuery` auto-updates on sync) | PowerSync already pushes changes; reactive queries fire automatically |

**Key insight:** The permission module from Phase 3 is the single authority. Phase 4 only adds UI enforcement layers -- route guards, navigation filtering, and conditional rendering. The server (RLS) is always the true enforcement layer; the client just provides a good UX.

## Common Pitfalls

### Pitfall 1: Flash of Unauthorized Content During Role Loading

**What goes wrong:** When navigating to a protected route, `useUserRole()` returns `null` momentarily while PowerSync loads data. The `RequireRole` guard sees `null` and redirects the user to the dashboard, even though they have the right role.
**Why it happens:** PowerSync queries are asynchronous. On initial page load or after navigation, there's a brief moment where the local database hasn't returned the role yet.
**How to avoid:** In `RequireRole`, treat `null` role as "loading" (show nothing or a spinner), NOT as "unauthorized." The distinction is: `null` = loading, recognized role without permission = redirect. Since `RequireOnboarded` already ensures farm membership exists, a null role inside protected routes means data hasn't loaded yet.
**Warning signs:** Users with valid roles get bounced to dashboard on page refresh or deep link.

### Pitfall 2: Super Admin Sync Rules Don't Include Other Farms' Data

**What goes wrong:** Super admin can see the farm selector, but switching to another farm shows no data because PowerSync only syncs data for farms in the user's `farm_members` rows.
**Why it happens:** Current PowerSync sync rules use `SELECT farm_id FROM farm_members WHERE user_id = request.user_id()` -- this only returns farms the super admin is explicitly a member of.
**How to avoid:** For Phase 4, super admin cross-farm access requires either: (a) adding the super admin as a member of all farms (simplest, but requires maintenance), or (b) adding a sync rule bucket that syncs ALL farm data for super_admin role users using JWT claims. Option (b) is cleaner: a new bucket that checks `request.jwt() ->> 'app_metadata.user_role' = 'super_admin'` and syncs all farms.
**Warning signs:** Super admin farm selector works but shows "No wells found" for other farms.

### Pitfall 3: Role Change Detection Triggers on Initial Load

**What goes wrong:** The role change detector fires `disconnectAndClear()` when the app first loads, causing an infinite reload loop.
**Why it happens:** The hook sees `null -> 'grower'` transition as a "role change" instead of "initial load."
**How to avoid:** Use a ref to track whether the initial value has been set. Only trigger `disconnectAndClear()` when transitioning from one known role to a different known role (e.g., `'admin' -> 'meter_checker'`), not from `null` to a role.
**Warning signs:** App enters an infinite reload loop on startup.

### Pitfall 4: Navigation Items Out of Sync with Route Guards

**What goes wrong:** A menu item is hidden via navigation filtering, but the route is still accessible via URL. Or vice versa: the route is guarded, but the menu item is visible.
**Why it happens:** Navigation filtering and route guards use different permission checks, or a new route is added without updating both.
**How to avoid:** Use the same `Action` enum for both navigation item visibility and route guard checks. Define the required action once per route/nav item.
**Warning signs:** A user can see a menu item but gets redirected when clicking it, or vice versa.

### Pitfall 5: PowerSync Write Fails Silently After Role Downgrade

**What goes wrong:** A user who was an admin (with `create_well` permission) gets downgraded to `meter_checker` while offline. Before sync, they create a new well locally. On next sync, PowerSync tries to upload the INSERT, Supabase RLS rejects it, and the connector marks it as a permanent error (code `42501`), discarding the transaction.
**Why it happens:** The connector's `isPermanentError()` function correctly discards RLS violations, but the user had no warning that their write would fail.
**How to avoid:** Add client-side write guards that check permissions before executing writes. The `hasPermission(role, 'create_well')` check catches this. Also, the role change detector (plan 04-04) will trigger `disconnectAndClear()` on role change, which removes stale data and prevents this scenario in most cases.
**Warning signs:** Well creation appears to succeed locally but the well disappears after sync.

### Pitfall 6: Active Farm Store Persists After Sign-Out

**What goes wrong:** Super admin selects Farm B, signs out, signs in as a different user. The Zustand store still holds the Farm B override, causing the new user to see Farm B's data (or more likely, an empty view since they don't have access).
**Why it happens:** Zustand stores persist in memory until the page is fully reloaded. The sign-out flow clears PowerSync and auth state but not custom Zustand stores.
**How to avoid:** Clear the active farm store as part of the sign-out flow in `AuthProvider.tsx`, or subscribe to auth state changes and auto-clear the store when session becomes null.
**Warning signs:** After sign-out and sign-in as a different user, the header shows the wrong farm name.

## Code Examples

Verified patterns from the existing codebase:

### Existing Route Guard Pattern (RequireAuth)

```typescript
// Source: src/components/RequireAuth.tsx (lines 13-82)
// This is the EXACT pattern to follow for RequireRole.
// Key characteristics:
// 1. Accepts optional fallbackPath
// 2. Shows loading state while checking
// 3. Renders <Outlet /> when authorized
// 4. Uses <Navigate replace /> for unauthorized redirect
export default function RequireAuth({
  children,
  fallbackPath = '/auth/phone',
}: RequireAuthProps) {
  const { isAuthReady, session } = useAuth();

  if (!isAuthReady) {
    return /* loading spinner */;
  }

  if (!session) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
```

### Existing Permission Check Pattern (SettingsPage)

```typescript
// Source: src/pages/SettingsPage.tsx (lines 25-26, 76-93)
// This is the established pattern for UI gating.
const userRole = useUserRole();
const canManageTeam = isAdminOrAbove(userRole);

// Conditional rendering based on permission
{canManageTeam && (
  <section className="mb-8">
    {/* Team Management content */}
  </section>
)}
```

### Current App Route Structure

```typescript
// Source: src/App.tsx (lines 22-62)
// RequireRole will nest between RequireOnboarded and AppLayout,
// OR wrap specific routes within AppLayout.
<Route element={<RequireAuth />}>
  <Route element={<RequireOnboarded />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/wells" element={<WellListPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      {/* ... */}
    </Route>
  </Route>
</Route>
```

### PowerSync disconnectAndClear Pattern

```typescript
// Source: src/lib/powersync.ts (lines 55-60)
// Already exists and is used in the sign-out flow.
export async function disconnectAndClear(): Promise<void> {
  if (powerSyncInstance) {
    await powerSyncInstance.disconnectAndClear();
    powerSyncInstance = null;
  }
}
```

**Important note on reconnection:** After `disconnectAndClear()`, the PowerSync instance is set to `null`. To reconnect, `setupPowerSync()` must be called again (which creates a new `PowerSyncDatabase`, calls `init()`, and `connect()`). The current `PowerSyncProvider` component calls `setupPowerSync()` on mount -- so a full component remount (via `window.location.reload()` or re-rendering `AppLayout`) will re-establish the connection. However, a more elegant approach would be to increment a retry counter in the PowerSync provider to trigger re-initialization without a full page reload.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Loader-based auth guards (Data Mode) | Wrapper component guards (declarative `<Routes>`) | React Router v7 supports both | This app uses declarative mode; wrapper pattern is correct |
| `window.location.reload()` after disconnectAndClear | Provider-level re-initialization via state key | PowerSync SDK improvements 2025 | Can avoid full page reload, but reload is simpler and safer |
| Manual polling for role changes | Reactive PowerSync queries | PowerSync SDK (current) | `useQuery` automatically re-fires when synced data changes |

**Deprecated/outdated:**
- React Router v6 `<Redirect>` component: Replaced by `<Navigate>` in v6/v7. This project already uses `<Navigate>`.
- `createBrowserRouter` with loaders for auth: Valid approach, but requires refactoring the entire routing from declarative `<Routes>` to Data Mode. Not appropriate for this app.

## Open Questions

1. **Super admin sync rules: all-farms bucket vs. explicit membership**
   - What we know: Current sync rules only sync data for farms where the user is a `farm_members` row. Super admin needs to see ALL farms.
   - What's unclear: Whether to add a new "all farms" sync bucket keyed on JWT role, or to add the super admin as a member of every farm.
   - Recommendation: Add a new sync rule bucket that checks `request.jwt() ->> 'app_metadata.user_role' = 'super_admin'` and syncs all farms/wells/members data. This avoids maintaining membership rows and is cleaner. However, this requires a PowerSync dashboard update (manual step). If the user count of super admins is tiny (1-2), the explicit membership approach is acceptable as a simpler v1. **The planner should choose one approach.**

2. **Does a `/users` route/page exist or need to be created?**
   - What we know: Success criterion 1 says "Meter checker cannot see the Users page." The requirements mention a "Users page." But there is no `UsersPage.tsx` in the codebase.
   - What's unclear: Is the "Users page" the Team Management section of SettingsPage, or a separate page?
   - Recommendation: The Team Management section in SettingsPage (which shows pending invites and the "Add User" button) IS the current "Users page" equivalent. No separate page creation is needed unless the user requests it. The success criterion is already partially met -- SettingsPage gates Team Management behind `isAdminOrAbove()`. Phase 4 should add route-level protection for `/settings` if it's meant to be admin-only, or keep `/settings` accessible to all but gate specific sections (current approach).

3. **PowerSync re-initialization after role change: reload vs. provider key**
   - What we know: `disconnectAndClear()` sets the instance to null. Calling `setupPowerSync()` creates a new one.
   - What's unclear: Whether a `window.location.reload()` is acceptable UX, or if we need a smoother provider re-mount.
   - Recommendation: `window.location.reload()` is the simplest and most reliable approach. Role changes are rare events (not something users do frequently). A full reload ensures all state (Zustand stores, contexts, PowerSync) is cleanly reset. The planner can decide if a smoother approach is worth the complexity.

4. **Settings page: route guard vs. section gating**
   - What we know: SettingsPage currently has account info (phone, farm ID, role, sign out) visible to all, plus Team Management visible only to admin+.
   - What's unclear: Should meter_checker be able to access `/settings` at all? The success criterion says "cannot see Settings sections for farm management" -- this implies they can see Settings, just not management sections.
   - Recommendation: Keep `/settings` accessible to all roles. Gate the Team Management section (already done) and any future farm management sections with `hasPermission()`. This matches the current implementation.

## Route-Permission Mapping

Based on codebase analysis and requirements, here is the proposed mapping:

| Route | Required Action | Accessible By | Notes |
|-------|----------------|---------------|-------|
| `/` (Dashboard/Map) | None | All roles | Map view is universal |
| `/wells` | `view_wells` | All roles | All roles can view wells |
| `/wells/new` | `create_well` | super_admin, grower, admin | Meter checker cannot create wells |
| `/reports` | None | All roles | Read-only reports |
| `/settings` | None | All roles | Page accessible, sections gated |
| `/settings` Team Mgmt section | `manage_users` | super_admin, grower, admin | Already gated in SettingsPage |
| `/subscription` | `manage_farm` | super_admin, grower | Billing/subscription is farm owner concern |
| `/language` | None | All roles | Personal preference |
| `/admin/farms` (new) | `cross_farm_access` | super_admin only | Farm selector/overview for super admin |

### UI Elements to Gate

| Element | Location | Required Action | Currently Gated? |
|---------|----------|----------------|-----------------|
| "New Well" button | DashboardPage (line 186-194) | `create_well` | **NO** - needs gating |
| "New Well" button | WellListPage (line 181-188) | `create_well` | **NO** - needs gating |
| "Add User" button | SettingsPage (line 83-89) | `manage_invites` | **YES** (via `canManageTeam`) |
| Team Management section | SettingsPage (line 76-93) | `manage_users` | **YES** (via `canManageTeam`) |
| Settings nav item | SideMenu (line 28) | None (sections gated) | Accessible to all |
| Subscription nav item | SideMenu (line 27) | `manage_farm` | **NO** - needs gating |
| Long-press well creation | DashboardPage (line 70-73) | `create_well` | **NO** - needs gating |

## Sources

### Primary (HIGH confidence)
- Existing codebase files: `src/lib/permissions.ts`, `src/hooks/useUserRole.ts`, `src/App.tsx`, `src/components/RequireAuth.tsx`, `src/components/RequireOnboarded.tsx`, `src/components/AppLayout.tsx`, `src/components/SideMenu.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/WellListPage.tsx`, `src/lib/powersync.ts`, `src/lib/powersync-connector.ts`
- Phase 3 research and verification: `.planning/phases/03-role-foundation/03-RESEARCH.md`, `03-VERIFICATION.md`
- PowerSync sync rules: `docs/powersync-sync-rules.yaml`
- Supabase migrations: `supabase/migrations/011_new_rls_policies.sql`, `021_four_role_system.sql`, `022_custom_access_token_hook.sql`

### Secondary (MEDIUM confidence)
- [React Router 7: Private Routes](https://www.robinwieruch.de/react-router-private-routes/) - Robin Wieruch (2025/2026)
- [Authentication with React Router v7: A complete guide](https://blog.logrocket.com/authentication-react-router-v7/) - LogRocket (updated January 2026)
- [PowerSync JS Web Client SDK docs](https://powersync-ja.github.io/powersync-js/web-sdk/classes/PowerSyncDatabase) - PowerSyncDatabase class reference
- [PowerSync JS Web Client SDK v1.29.1 release notes](https://releases.powersync.com/announcements/powersync-js-web-client-sdk) - disconnectAndClear improvements

### Tertiary (LOW confidence)
- None - all findings verified against codebase and official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, all existing infrastructure from Phase 3
- Architecture: HIGH - Follows established patterns (RequireAuth, RequireOnboarded, SettingsPage gating)
- Route guards: HIGH - Pattern identical to existing RequireAuth component
- Navigation filtering: HIGH - Simple array filter with existing permission functions
- Super admin cross-farm: MEDIUM - Zustand store pattern is standard, but sync rule changes need PowerSync dashboard update (manual step, untested)
- Role change detection: MEDIUM - PowerSync reactive queries confirmed to fire on sync, but disconnectAndClear + reconnect flow needs careful implementation
- Pitfalls: HIGH - Identified from codebase analysis and existing connector error handling patterns

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable domain, no fast-moving dependencies)
