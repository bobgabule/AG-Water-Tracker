# Phase 19: Permission Enforcement - Research

**Researched:** 2026-02-22
**Domain:** Client-side role-based access control (RBAC) in React + PowerSync
**Confidence:** HIGH

## Summary

Phase 19 extends the existing permission system from coarse-grained actions (`manage_wells`, `view_members`) to fine-grained actions (`create_well`, `edit_well`, `delete_well`, `manage_allocations`), then enforces these permissions across the entire UI: route guards, button visibility, navigation items, and page-level access.

The project already has all the infrastructure needed: a `permissions.ts` module with a typed permission matrix, a `RequireRole` route guard component, and a `useUserRole()` hook that reads the role from PowerSync's local database (works offline). The work is primarily extending the matrix, adding route guards to unguarded routes, and adding `hasPermission` checks to hide UI elements from meter checkers.

**Primary recommendation:** Extend `permissions.ts` with the 12-action matrix from CONTEXT.md, add `RequireRole` guards on `/wells/:id/edit`, `/wells/:id/allocations`, and `/users` routes in `App.tsx`, then add conditional rendering throughout UI components using the existing `hasPermission(role, action)` pattern already established in `DashboardPage`, `WellListPage`, and `SideMenu`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Guarded routes redirect silently to well detail page (`/wells/:id`)
- No toast or notification on redirect -- the missing buttons signal no access
- Same redirect pattern for all guarded routes (edit well, allocations, create well)
- Must work offline -- guard checks role from local PowerSync DB
- super_admin goes through the permission matrix (not a special bypass)
- No role demotion exists -- roles are set at invite time, permissions read from live synced role
- All gated buttons are completely hidden (not disabled) for meter checkers
- Hidden buttons: Edit Well, Delete Well (future), New Well, allocation CRUD, View Allocations link
- Add Well FAB on map: hidden for meter checkers
- New Well button on wells list page: hidden for meter checkers
- Record Reading button: visible to all roles (core meter checker action)
- Well list items: identical appearance for all roles
- Bottom nav for meter checkers: Map, Wells, Settings, Language (Users tab hidden)
- Users page: hidden entirely for meter checkers (nav item + route)
- Settings page: reduced set for meter checkers -- hide all farm-level management settings (subscription, farm name, etc.), show only personal settings
- Admins see everything growers see -- identical visibility
- Meter checkers see allocation data (usage gauge, allocation period) on well detail page in read-only mode
- View Allocations link on well detail page: hidden for meter checkers
- Route guard on `/wells/:id/allocations`: redirects meter checkers to well detail (silent)
- Well list page: allocation columns (usage %, status) visible to meter checkers
- Admins have full allocation CRUD (create, edit, delete) -- same as growers
- Admins can delete wells -- same as growers
- Permission matrix has 12 actions: `create_well`, `edit_well`, `delete_well`, `manage_allocations`, `record_reading`, `edit_reading`, `delete_reading`, `view_wells`, `manage_users`, `manage_farm`, `manage_invites`, `cross_farm_access`
- Removed: `manage_wells` (replaced by granular actions), `view_members` (no longer needed)
- All existing `manage_wells` and `view_members` references must be found and updated

### Claude's Discretion
- Whether to use a reusable `<PermissionGuard>` component or per-page inline checks (based on existing patterns)
- Whether to add convenience helpers like `canManageWells(role)` (based on how many places need grouped checks)
- Whether to keep or remove `isAdminOrAbove()` (evaluate usage, replace with action checks where appropriate)
- Loading/skeleton states during permission resolution

### Deferred Ideas (OUT OF SCOPE)
- Well deletion UI -- permission action `delete_well` added to matrix now, but the UI for deleting wells is not built yet (future phase)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERM-01 | Well edit/delete gated to grower and admin only (WellEditPage route guard + WellDetailHeader) | Existing `RequireRole` component wraps routes in `App.tsx`; add for `/wells/:id/edit`. `WellDetailHeader` edit button needs `hasPermission` conditional. |
| PERM-02 | Allocation management gated to grower and admin only (WellAllocationsPage route guard) | Add `RequireRole` guard on `/wells/:id/allocations` route. Redirect to `/wells/:id`. |
| PERM-03 | Well detail edit button hidden for meter checkers | `WellDetailHeader.tsx` renders the edit button unconditionally. Add `hasPermission(role, 'edit_well')` check with `useUserRole()`. |
| PERM-04 | Extend permission matrix in `permissions.ts` with fine-grained actions (edit_well, delete_well, manage_allocations) | Replace current 9-action matrix with 12-action matrix. Remove `manage_wells` and `view_members`, add `edit_well`, `delete_well`, `manage_allocations`, `edit_reading`, `delete_reading`. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in project |
| react-router | v7 | Routing with guards | Already in project; `RequireRole` wraps routes |
| PowerSync | @powersync/react | Offline-first role data | `useUserRole()` queries `farm_members` locally |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @heroicons/react | v2 | Icons for hidden/visible buttons | Already used throughout |

### Alternatives Considered
None -- this phase uses only existing project infrastructure. No new libraries needed.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
No new files or folders. Changes are entirely within existing files:
```
src/
  lib/permissions.ts          # Extend ACTIONS array + PERMISSION_MATRIX
  components/RequireRole.tsx   # Already exists, no changes needed
  components/WellDetailHeader.tsx  # Add role check for edit button
  components/SideMenu.tsx      # Add `requiredAction` to Users nav item
  pages/WellEditPage.tsx       # Protected by route guard (no page changes)
  pages/WellAllocationsPage.tsx # Protected by route guard (no page changes)
  pages/UsersPage.tsx          # Protected by route guard (no page changes)
  pages/SettingsPage.tsx       # Conditionally hide farm-level sections
  App.tsx                      # Add RequireRole guards to routes
```

### Pattern 1: Route Guard via RequireRole (Existing Pattern)
**What:** Wrap route definitions in `App.tsx` with `<RequireRole action="..." fallbackPath="...">` to redirect unauthorized users.
**When to use:** Any route that should be inaccessible to certain roles.
**Example (already in codebase):**
```typescript
// App.tsx - existing pattern for subscription page
<Route element={<RequireRole action="manage_farm" />}>
  <Route path="/subscription" element={<SubscriptionPage />} />
</Route>
```
**New usage for this phase:**
```typescript
// Guard well edit and allocations routes
<Route path="/wells/:id" element={<WellDetailPage />} />
<Route element={<RequireRole action="edit_well" fallbackPath="/" />}>
  <Route path="/wells/:id/edit" element={<WellEditPage />} />
</Route>
<Route element={<RequireRole action="manage_allocations" fallbackPath="/" />}>
  <Route path="/wells/:id/allocations" element={<WellAllocationsPage />} />
</Route>
```

**Note on fallbackPath:** The RequireRole component takes a static `fallbackPath` string. Since well edit/allocation routes include a dynamic `:id` parameter, the fallback cannot redirect to `/wells/:id` via the component's current API. The component would need modification to support dynamic fallback paths, OR the fallback can redirect to `/` (map page) which is acceptable per the user's intent of "redirect silently."

### Pattern 2: Inline Permission Check for Button Visibility (Existing Pattern)
**What:** Use `hasPermission(role, action)` inline to conditionally render buttons/links.
**When to use:** Any UI element that should be hidden for certain roles.
**Example (already in codebase):**
```typescript
// DashboardPage.tsx - existing pattern for New Well button
const role = useUserRole();
const canCreateWell = hasPermission(role, 'create_well');
// ... later in JSX:
{canCreateWell && (
  <button onClick={handleNewWell}>New Well</button>
)}
```

### Pattern 3: Navigation Item Filtering (Existing Pattern)
**What:** Add `requiredAction` property to nav items and filter by `hasPermission`.
**When to use:** SideMenu or any navigation that should hide items for certain roles.
**Example (already in codebase):**
```typescript
// SideMenu.tsx - existing pattern
const navItems: NavItem[] = [
  { label: 'Subscription', icon: CreditCardIcon, path: '/subscription', requiredAction: 'manage_farm' },
];
const visibleItems = navItems.filter(
  (item) => !item.requiredAction || hasPermission(role, item.requiredAction)
);
```

### Anti-Patterns to Avoid
- **Hardcoding role strings in components:** Use `hasPermission(role, 'action')` not `role === 'meter_checker'`. The permission matrix is the single source of truth.
- **Disabled buttons instead of hidden:** The user explicitly decided gated buttons should be completely hidden, not disabled.
- **Toast/notification on redirect:** The user explicitly decided no toast or notification on redirect.
- **Special-casing super_admin:** super_admin goes through the permission matrix like any other role. No bypass logic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route guarding | Custom redirect logic in each page | `RequireRole` component in `App.tsx` | Already exists, consistent pattern, handles loading state |
| Permission checks | Scattered `role === 'meter_checker'` checks | `hasPermission(role, action)` | Single source of truth, type-safe, refactorable |
| Navigation filtering | Manual show/hide per nav item | `requiredAction` property on nav items | Already established in `SideMenu.tsx` |

**Key insight:** Every pattern needed for this phase already exists in the codebase. This phase is about extending coverage, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Dynamic Fallback Path in RequireRole
**What goes wrong:** `RequireRole` currently takes a static `fallbackPath` string. For routes like `/wells/:id/edit`, the ideal fallback is `/wells/:id` (the well detail page), but `:id` is dynamic.
**Why it happens:** `RequireRole` renders as a layout route wrapper and doesn't have access to URL params.
**How to avoid:** Either (a) modify `RequireRole` to accept a function `(params) => string` for fallbackPath, or (b) use a static fallback like `/` (map page) which the user indicated is acceptable ("redirect silently to well detail page" -- but `/` is also fine since the missing buttons already signal no access). Option (a) is cleaner for the user's stated preference of redirecting to well detail.
**Warning signs:** If testing shows redirect to `/` when `/wells/:id` was expected.

### Pitfall 2: Forgetting to Audit All manage_wells / view_members References
**What goes wrong:** Old action names remain in the codebase after renaming, causing permission checks to silently fail (action not in matrix means no permission for anyone).
**Why it happens:** The TypeScript compiler will catch string literal mismatches IF the Action type is properly constrained, but runtime-constructed strings may slip through.
**How to avoid:** After updating `permissions.ts`, run `npx tsc -b --noEmit` to catch type errors. Also grep for the old action names: `manage_wells`, `view_members`.
**Warning signs:** TypeScript errors after updating ACTIONS array; features that previously worked now denied for all roles.

### Pitfall 3: Role Loading State (null role)
**What goes wrong:** While PowerSync initializes, `useUserRole()` returns `null`. Components that do `hasPermission(null, action)` get `false`, briefly hiding buttons for all users.
**Why it happens:** PowerSync needs to load local data before role is available.
**How to avoid:** `RequireRole` already handles this (renders `null` while loading). For inline checks, be aware that buttons may flash hidden then visible on initial load. Accept this as acceptable behavior or add loading skeleton.
**Warning signs:** Brief flash of restricted UI on page load for all users.

### Pitfall 4: WellDetailHeader is React.memo
**What goes wrong:** Adding `useUserRole()` inside `WellDetailHeader` breaks the `React.memo` wrapper since hooks can't be called conditionally and the component is memoized.
**Why it happens:** `WellDetailHeader` is wrapped in `React.memo` and receives `onEdit` as a prop.
**How to avoid:** Two options: (a) lift the permission check to `WellDetailSheet` (parent) and pass `canEdit` as a boolean prop, or (b) call `useUserRole()` inside `WellDetailHeader` (hooks inside `React.memo` are valid, they just cause re-renders when role changes -- which is correct behavior). Option (a) follows existing project patterns better since `WellDetailSheet` already manages `onEdit`.
**Warning signs:** Stale edit button visibility after role change if memo prevents re-render.

### Pitfall 5: WellEditPage Allocations Link Not Guarded
**What goes wrong:** The allocations link button inside `WellEditPage.tsx` (line 489-503) navigates to `/wells/:id/allocations`. If only the route is guarded but the button is still visible, the user clicks it and gets silently redirected -- confusing.
**Why it happens:** Easy to guard the route but forget the in-page link.
**How to avoid:** Since `WellEditPage` is itself behind an `edit_well` guard, meter checkers will never reach it. The allocations link button on the edit page is only visible to users who already passed the `edit_well` check. However, verify this is correct -- the user wants the "View Allocations link on well detail page" hidden, which is a different link. The edit page allocations link is fine since meter checkers can't reach the edit page.
**Warning signs:** None -- this is actually safe because of cascading guards.

### Pitfall 6: Users Page Needs Both Route Guard AND Nav Item Hidden
**What goes wrong:** Users page accessible via direct URL even though nav item is hidden.
**Why it happens:** Hiding the nav item in SideMenu doesn't prevent direct URL access.
**How to avoid:** Add both: (1) `requiredAction: 'manage_users'` on the Users nav item in SideMenu, and (2) `RequireRole` route guard in `App.tsx` for `/users`.
**Warning signs:** Meter checker types `/users` in URL bar and sees the page.

## Code Examples

### Updated Permission Matrix (permissions.ts)
```typescript
// Source: CONTEXT.md decisions + existing permissions.ts patterns

export const ACTIONS = [
  'create_well',
  'edit_well',
  'delete_well',
  'manage_allocations',
  'record_reading',
  'edit_reading',
  'delete_reading',
  'view_wells',
  'manage_users',
  'manage_farm',
  'manage_invites',
  'cross_farm_access',
] as const;
export type Action = (typeof ACTIONS)[number];

const ALL_ACTIONS: Set<Action> = new Set(ACTIONS);

const ALL_EXCEPT_CROSS_FARM: Set<Action> = new Set(
  ACTIONS.filter((a) => a !== 'cross_farm_access')
);

export const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  super_admin: ALL_ACTIONS,
  grower: ALL_EXCEPT_CROSS_FARM,
  admin: new Set<Action>([
    'create_well',
    'edit_well',
    'delete_well',
    'manage_allocations',
    'record_reading',
    'edit_reading',
    'delete_reading',
    'view_wells',
    'manage_users',
    'manage_invites',
  ]),
  meter_checker: new Set<Action>([
    'record_reading',
    'edit_reading',
    'delete_reading',
    'view_wells',
  ]),
};
```

### Route Guards in App.tsx
```typescript
// Source: existing RequireRole pattern in App.tsx
<Route path="/wells/:id" element={<WellDetailPage />} />
<Route element={<RequireRole action="edit_well" fallbackPath="/" />}>
  <Route path="/wells/:id/edit" element={<WellEditPage />} />
</Route>
<Route element={<RequireRole action="manage_allocations" fallbackPath="/" />}>
  <Route path="/wells/:id/allocations" element={<WellAllocationsPage />} />
</Route>
<Route element={<RequireRole action="manage_users" fallbackPath="/" />}>
  <Route path="/users" element={<UsersPage />} />
</Route>
```

### Hidden Edit Button in WellDetailHeader
```typescript
// Source: existing DashboardPage hasPermission pattern
// Option A: Lift check to WellDetailSheet (parent)
// In WellDetailSheet.tsx:
const role = useUserRole();
const canEdit = hasPermission(role, 'edit_well');
// Pass to header:
<WellDetailHeader
  well={well}
  farmName={farmName}
  proximityInRange={proximityInRange}
  onClose={onClose}
  onEdit={canEdit ? onEdit : undefined}
/>
// In WellDetailHeader: conditionally render edit button when onEdit is defined
{onEdit && (
  <button onClick={onEdit}>Edit</button>
)}
```

### SideMenu Users Nav Item Filtering
```typescript
// Add requiredAction to Users nav item
{ label: 'Users', icon: UsersIcon, path: '/users', requiredAction: 'manage_users' },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Coarse `manage_wells` action | Granular `create_well`, `edit_well`, `delete_well` | Phase 19 (now) | Enables per-operation permission control |
| `view_members` action | Users page gated by `manage_users` | Phase 19 (now) | Meter checkers lose Users page access entirely |
| `isAdminOrAbove()` helper | `hasPermission(role, action)` checks | Phase 19 (now) | Unused function, can be removed for clarity |

**Deprecated/outdated:**
- `manage_wells`: Replaced by `create_well`, `edit_well`, `delete_well`. Currently only used in `permissions.ts` itself (admin role set). No external consumers -- TypeScript will catch references after removal.
- `view_members`: Replaced by `manage_users` gating on Users page. Currently only used in `permissions.ts` itself (admin and meter_checker sets).
- `isAdminOrAbove()`: Defined in `permissions.ts` but never imported anywhere in the codebase. Safe to remove.

## Audit: All Permission Touchpoints

Complete inventory of every location where permissions are currently checked or need to be added:

### Already Using Permissions (verify/update)
| File | Current Check | Needed Change |
|------|---------------|---------------|
| `src/lib/permissions.ts` | `manage_wells`, `view_members` in ACTIONS and PERMISSION_MATRIX | Replace with new 12-action matrix |
| `src/pages/DashboardPage.tsx` | `hasPermission(role, 'create_well')` for New Well FAB | No change needed (already correct) |
| `src/pages/WellListPage.tsx` | `hasPermission(role, 'create_well')` for New Well button | No change needed (already correct) |
| `src/pages/UsersPage.tsx` | `hasPermission(userRole, 'manage_users')` for invite/delete buttons | No change needed for inline checks |
| `src/components/SideMenu.tsx` | `requiredAction: 'manage_farm'` on Subscription | Add `requiredAction: 'manage_users'` to Users item |
| `src/components/Header.tsx` | `hasPermission(role, 'cross_farm_access')` | No change needed |
| `src/App.tsx` | `RequireRole action="manage_farm"` on subscription route | Add guards for edit, allocations, users routes |

### Need Permission Checks Added
| File | What to Add | Action to Check |
|------|-------------|-----------------|
| `src/components/WellDetailHeader.tsx` (or parent `WellDetailSheet.tsx`) | Hide edit button for meter checkers | `edit_well` |
| `src/App.tsx` | Route guard for `/wells/:id/edit` | `edit_well` |
| `src/App.tsx` | Route guard for `/wells/:id/allocations` | `manage_allocations` |
| `src/App.tsx` | Route guard for `/users` | `manage_users` |
| `src/pages/SettingsPage.tsx` | Hide farm-level sections (Farm ID, etc.) for meter checkers | `manage_farm` |
| `src/components/SideMenu.tsx` | Users nav item hidden for meter checkers | `manage_users` |

### No Changes Needed (Verified Safe)
| File | Reason |
|------|--------|
| `src/pages/WellEditPage.tsx` | Protected by route guard; no inline permission check needed |
| `src/pages/WellAllocationsPage.tsx` | Protected by route guard; no inline permission check needed |
| `src/pages/WellDetailPage.tsx` | Accessible to all roles; edit button gated in WellDetailHeader |
| `src/components/WellUsageGauge.tsx` | Read-only display; visible to all roles per decision |
| `src/pages/WellListPage.tsx` | Well list items identical for all roles; allocation columns visible per decision |
| `src/pages/SubscriptionPage.tsx` | Already behind `manage_farm` route guard |

## Open Questions

1. **RequireRole dynamic fallback path**
   - What we know: The user wants redirect to well detail page (`/wells/:id`), but `RequireRole` only accepts a static string for `fallbackPath`.
   - What's unclear: Whether the user would accept redirect to `/` (map) instead, or whether `RequireRole` should be enhanced.
   - Recommendation: Enhance `RequireRole` to optionally accept a function `(params: Record<string, string>) => string` using `useParams()` internally. This is a small, targeted change. Alternatively, redirect to `/` since the user said "redirect silently" and the missing buttons already signal restricted access. The planner should decide which approach to take.

2. **Settings page "farm-level management settings" scope**
   - What we know: The user wants meter checkers to see only personal settings on the Settings page, hiding "all farm-level management settings (subscription, farm name, etc.)."
   - What's unclear: The current SettingsPage shows Profile (personal), Account (phone, farm ID, role), and Sign Out. Which sections count as "farm-level"? Farm ID display is informational, not a management action.
   - Recommendation: Hide the "Farm ID" row for meter checkers using `hasPermission(role, 'manage_farm')`. Keep phone, role, profile edit, and sign out visible to all. The Subscription link is already hidden via SideMenu gating.

3. **WellListPage `/wells/new` route**
   - What we know: The WellListPage's "New Well" button navigates to `/wells/new` which doesn't exist as a route in `App.tsx`. This currently falls through to the catch-all `<Navigate to="/" replace />`.
   - What's unclear: Whether this is intentional (redirect to map where the actual add-well flow lives) or a bug.
   - Recommendation: Not a Phase 19 concern. The `canCreateWell` check already hides this button for meter checkers. No action needed.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - Direct reading of all relevant source files:
  - `src/lib/permissions.ts` - Current permission matrix, ACTIONS array, hasPermission/isAdminOrAbove functions
  - `src/components/RequireRole.tsx` - Route guard component implementation
  - `src/hooks/useUserRole.ts` - PowerSync-based role query hook
  - `src/App.tsx` - Current route definitions and existing RequireRole usage
  - `src/components/SideMenu.tsx` - Navigation filtering pattern
  - `src/components/WellDetailHeader.tsx` - Edit button rendering (no permission check)
  - `src/components/WellDetailSheet.tsx` - Parent component managing onEdit callback
  - `src/pages/DashboardPage.tsx` - Existing hasPermission pattern for create_well
  - `src/pages/WellListPage.tsx` - Existing hasPermission pattern for create_well
  - `src/pages/WellEditPage.tsx` - No current permission checks
  - `src/pages/WellAllocationsPage.tsx` - No current permission checks
  - `src/pages/UsersPage.tsx` - Existing manage_users check
  - `src/pages/SettingsPage.tsx` - Current layout (profile, account, sign out)
  - `src/components/Header.tsx` - Existing cross_farm_access check

### Secondary (MEDIUM confidence)
- None needed -- all research is codebase-based

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; all infrastructure exists in the codebase
- Architecture: HIGH - All three patterns (route guard, inline check, nav filtering) are already established and battle-tested in the project
- Pitfalls: HIGH - Identified from direct code inspection; edge cases are concrete and verifiable

**Research date:** 2026-02-22
**Valid until:** Indefinite (codebase-specific patterns, not library-version-dependent)
