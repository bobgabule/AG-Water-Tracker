# Architecture Research: Role-Based Access Control for Offline-First PWA

**Domain:** Agricultural water tracking PWA with role-based user management
**Researched:** 2026-02-10
**Confidence:** HIGH

## Executive Summary

Adding role-based access control (RBAC) to a Supabase + PowerSync offline-first app requires enforcement at three distinct layers -- Supabase RLS (server-side source of truth), PowerSync sync rules (what data reaches each device), and client-side guards (UI visibility and route protection). This is not optional: all three layers are required because any single layer can be bypassed. The existing codebase already implements all three layers in partial form; the work is completing and hardening them for a full 4-role model.

The current codebase already has a working `farm_members.role` column with `owner | admin | member` values, RLS helper functions (`get_user_admin_farm_ids()`, `get_user_farm_ids()`), PowerSync sync rules filtered by role (e.g., `farm_invites` only synced to owner/admin), and client-side role checks in `SettingsPage.tsx`. The architecture for RBAC is already in place. What remains is extending it to 4 roles (adding `viewer`), hardening the client-side guards, and adding the missing permission matrix.

---

## System Overview

```
+------------------------------------------------------------------+
|                    CLIENT (Browser / PWA)                         |
+------------------------------------------------------------------+
|                                                                  |
|  +--------------------+    +---------------------------+         |
|  |  Route Guards       |    |  UI Permission Guards     |         |
|  |  - RequireAuth      |    |  - useUserRole() hook     |         |
|  |  - RequireOnboarded |    |  - hasPermission() util   |         |
|  |  - RequireRole      |    |  - conditional rendering  |         |
|  +--------+------------+    +-----------+---------------+         |
|           |                             |                        |
|  +--------v-----------------------------v---------------+         |
|  |              React Components (Pages, Modals)        |         |
|  +--------+--------------------------------------------+         |
|           | reads/writes                                         |
|  +--------v--------------------------------------------+         |
|  |        PowerSync Local SQLite Database               |         |
|  |  [farms] [users] [farm_members] [farm_invites]       |         |
|  |  [wells] [readings] [allocations]                    |         |
|  +--------+--------------------------------------------+         |
|           | CRUD upload queue                                    |
+-----------|------------------------------------------------------+
            |
    Sync via WebSocket (bidirectional)
            |
+-----------v------------------------------------------------------+
|                    POWERSYNC SERVICE                              |
|  Sync Rules (bucket_definitions):                                |
|  - user_farms: all members get farm data                         |
|  - farm_members: all members get membership data                 |
|  - farm_invites_owner: only owners get invites                   |
|  - farm_invites_admin: only admins get invites                   |
|  - farm_wells: all members get wells                             |
|  - user_profile: user gets own profile                           |
+-----------+------------------------------------------------------+
            |
    Replication via Postgres logical replication
            |
+-----------v------------------------------------------------------+
|                    SUPABASE (PostgreSQL)                          |
+------------------------------------------------------------------+
|  +------------------+  +--------------------+                    |
|  | RLS Policies     |  | SECURITY DEFINER   |                    |
|  | (per-table)      |  | RPCs               |                    |
|  +------------------+  +--------------------+                    |
|  | get_user_farm_ids()  | invite_user_by_phone()                 |
|  | get_user_admin_      | get_onboarding_status()                |
|  |   farm_ids()         | create_farm_and_membership()           |
|  +------------------+  | revoke_farm_invite()                    |
|                        +--------------------+                    |
|  +-------------------------------------------------------+       |
|  | Tables: farms, users, farm_members, farm_invites,     |       |
|  |         wells, readings, allocations                   |       |
|  +-------------------------------------------------------+       |
|                                                                  |
|  +-------------------------------------------------------+       |
|  | Supabase Auth (Phone OTP)                             |       |
|  +-------------------------------------------------------+       |
|                                                                  |
|  +-------------------------------------------------------+       |
|  | Edge Functions: send-invite-sms (Twilio)              |       |
|  +-------------------------------------------------------+       |
+------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **RequireAuth** | Checks session exists, shows loader/offline message | Supabase Auth via AuthProvider |
| **RequireOnboarded** | Checks `hasProfile` + `hasFarmMembership`, redirects to onboarding | AuthProvider (onboardingStatus) |
| **RequireRole** (new) | Checks user's role meets minimum required for a route | PowerSync local DB (farm_members) |
| **useUserRole() hook** (new) | Returns current user's role from local farm_members table | PowerSync local SQLite |
| **AuthProvider** | Session management, OTP flow, onboarding status via RPC | Supabase Auth, `get_onboarding_status()` RPC |
| **PowerSync Connector** | CRUD upload queue, credential refresh, error classification | Supabase REST API |
| **Supabase RLS** | Server-side data access enforcement per role | PostgreSQL helper functions |
| **PowerSync Sync Rules** | Controls which data reaches each device | farm_members.role filtering |
| **Edge Function: send-invite-sms** | Sends Twilio SMS invite to phone number | Twilio API |

---

## Recommended Project Structure

The existing folder structure is well-organized. For RBAC, add these files to the existing structure:

```
src/
├── components/
│   ├── RequireRole.tsx           # NEW: Route guard for role-based access
│   ├── AddUserModal.tsx          # EXISTS: Invite flow modal
│   ├── PendingInvitesList.tsx    # EXISTS: Invite management list
│   └── ...existing components
├── hooks/
│   ├── useUserRole.ts            # NEW: Returns current user's farm role
│   └── ...existing hooks
├── lib/
│   ├── permissions.ts            # NEW: Permission matrix and helpers
│   ├── AuthProvider.tsx          # EXISTS: Add role to OnboardingStatus
│   ├── powersync-connector.ts    # EXISTS: No changes needed
│   └── ...existing lib files
├── pages/
│   ├── SettingsPage.tsx          # EXISTS: Already has role checks
│   └── ...existing pages
└── types/
    └── roles.ts                  # NEW: Role type definitions
```

### Structure Rationale

- **`lib/permissions.ts`**: Centralizes the permission matrix as a single source of truth. Both route guards and UI components import from here. Avoids scattering role checks across components.
- **`hooks/useUserRole.ts`**: Reads from PowerSync local SQLite, so it works offline. Returns the role from the locally-synced `farm_members` table.
- **`components/RequireRole.tsx`**: Follows the existing guard pattern (`RequireAuth` -> `RequireOnboarded` -> `RequireRole`) in the route hierarchy.
- **`types/roles.ts`**: TypeScript type definitions for roles and permissions, preventing typos and enabling autocomplete.

---

## Architectural Patterns

### Pattern 1: Three-Layer Role Enforcement

**What:** Roles are enforced at three independent layers, each with a specific purpose:

1. **Supabase RLS** (server-side) -- prevents unauthorized data access at the database level, even if the client is compromised
2. **PowerSync Sync Rules** (sync layer) -- prevents unauthorized data from reaching the device, reducing attack surface and local DB size
3. **Client-side guards** (UI layer) -- provides responsive UX by hiding actions the user cannot perform, without waiting for server round-trips

**When to use:** Always. All three layers are mandatory for any role-based system in an offline-first app.

**Trade-offs:**
- PRO: Defense in depth. A bug in one layer doesn't expose data.
- PRO: Client-side guards provide instant feedback without network latency.
- CON: Role definitions must be kept in sync across three systems.
- CON: More code to maintain.

**Example of enforcement at each layer:**

```typescript
// Layer 1: Supabase RLS (server-side) -- already implemented in migration 011
// Only owners/admins can create wells
CREATE POLICY "Owners and admins can create wells"
    ON wells FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_admin_farm_ids()));

// Layer 2: PowerSync Sync Rules (sync layer) -- already implemented
// farm_invites only sync to owners and admins
// bucket: farm_invites_owner / farm_invites_admin

// Layer 3: Client-side guard (UI layer) -- partially implemented
// SettingsPage.tsx already does this:
const isAdminOrOwner = useMemo(() => {
  const role = membershipData?.[0]?.role;
  return role === 'owner' || role === 'admin';
}, [membershipData]);
```

### Pattern 2: Permission Matrix as Central Source of Truth

**What:** Define a single permission matrix mapping roles to actions. All client-side checks reference this matrix.

**When to use:** When you have more than 2 roles or more than 5 permission-gated actions.

**Trade-offs:**
- PRO: Single place to update permissions. No scattered `role === 'admin'` checks.
- PRO: Easy to audit and test.
- CON: Slight over-engineering for very simple apps (not the case here).

**Example:**

```typescript
// src/lib/permissions.ts
export type FarmRole = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'wells:create'
  | 'wells:edit'
  | 'wells:delete'
  | 'readings:create'
  | 'readings:edit'
  | 'readings:delete'
  | 'team:invite'
  | 'team:remove'
  | 'team:change-role'
  | 'farm:edit'
  | 'invites:view'
  | 'invites:revoke';

const PERMISSION_MATRIX: Record<FarmRole, Set<Permission>> = {
  owner: new Set([
    'wells:create', 'wells:edit', 'wells:delete',
    'readings:create', 'readings:edit', 'readings:delete',
    'team:invite', 'team:remove', 'team:change-role',
    'farm:edit', 'invites:view', 'invites:revoke',
  ]),
  admin: new Set([
    'wells:create', 'wells:edit', 'wells:delete',
    'readings:create', 'readings:edit', 'readings:delete',
    'team:invite', 'invites:view', 'invites:revoke',
  ]),
  member: new Set([
    'wells:create',
    'readings:create', 'readings:edit', 'readings:delete',
  ]),
  viewer: new Set([
    // Read-only access. No write permissions.
  ]),
};

export function hasPermission(role: FarmRole | null, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}
```

### Pattern 3: Offline-Safe Role Reads via PowerSync Local DB

**What:** Read the user's role from the locally-synced `farm_members` table, not from the server. This ensures role checks work offline.

**When to use:** Always, in an offline-first app. The `useUserRole()` hook queries PowerSync's local SQLite.

**Trade-offs:**
- PRO: Works offline -- role is available from the local DB.
- PRO: Reactive -- PowerSync auto-updates when sync completes, so if a role changes server-side, the client eventually picks it up.
- CON: Stale data -- if the user is offline when their role changes, the local DB has the old role until next sync. This is acceptable because Supabase RLS still enforces the correct role server-side when the CRUD upload queue processes.

**Example:**

```typescript
// src/hooks/useUserRole.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import type { FarmRole } from '../lib/permissions';

export function useUserRole(): FarmRole | null {
  const { user, onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId;

  const { data } = useQuery<{ role: string }>(
    farmId && user?.id
      ? 'SELECT role FROM farm_members WHERE farm_id = ? AND user_id = ?'
      : 'SELECT NULL WHERE 0',
    farmId && user?.id ? [farmId, user.id] : []
  );

  return useMemo(() => {
    const role = data?.[0]?.role as FarmRole | undefined;
    return role ?? null;
  }, [data]);
}
```

### Pattern 4: Server-Side Auto-Matching Invite Flow

**What:** The invite flow uses `get_onboarding_status()` as a SECURITY DEFINER RPC that auto-matches a user's phone number against pending `farm_invites`. This avoids requiring the user to manually enter an invite code.

**When to use:** When you want a "magic link" style invite experience where the invitee just verifies their phone via OTP and lands directly in the app.

**This pattern is already implemented** in migration 019 (`get_onboarding_status()`):

```
Admin invites user by phone
    |
    v
farm_invites row created (invited_phone, invited_name, role, farm_id)
    |
    v
SMS sent via Edge Function (Twilio)
    |
    v
Invitee clicks link -> enters phone -> OTP verification
    |
    v
Supabase Auth creates auth.users record with phone
    |
    v
Client calls get_onboarding_status() RPC
    |
    v
RPC auto-matches phone -> creates users row + farm_members row
    |
    v
RequireOnboarded sees hasFarmMembership=true -> redirects to dashboard
```

**Trade-offs:**
- PRO: Zero-friction invite experience. User never sees an invite code.
- PRO: Server-side matching is secure -- the user must prove ownership of the phone number via OTP.
- CON: `get_onboarding_status()` does double duty (status check + side-effect mutations). This is acceptable because it is idempotent (`ON CONFLICT DO NOTHING`).

---

## Data Flow

### Invite-to-Dashboard Flow (Complete Journey)

```
Admin (SettingsPage)
    |
    | clicks "Add User"
    v
AddUserModal
    | name, phone, role
    v
supabase.rpc('invite_user_by_phone')          [Supabase RPC]
    | validates: role, phone format,
    | admin permission, duplicate check
    | creates farm_invites row
    v
supabase.functions.invoke('send-invite-sms')   [Edge Function]
    | sends Twilio SMS with app link
    v
Invitee receives SMS, taps link
    |
    v
PhonePage -> enters phone
    |
    v
VerifyPage -> enters OTP code
    |
    v
supabase.auth.verifyOtp()                      [Supabase Auth]
    | creates auth.users record (phone)
    v
AuthProvider.verifyOtp() callback
    | calls fetchOnboardingStatus()
    v
supabase.rpc('get_onboarding_status')          [Supabase RPC]
    | matches phone -> farm_invites.invited_phone
    | auto-creates users row (profile)
    | auto-creates farm_members row (with invite's role)
    | increments farm_invites.uses_count
    | returns { hasProfile: true, hasFarmMembership: true, farmId, farmName }
    v
RequireOnboarded
    | sees hasFarmMembership=true
    | renders <Outlet /> (protected routes)
    v
AppLayout -> DashboardPage (MapView)
    | PowerSync connects, syncs farm data
    v
User sees their farm's wells on the map
```

### Role Check Data Flow (Offline-Safe)

```
Component needs to check permission
    |
    v
useUserRole() hook
    | queries PowerSync local SQLite:
    | SELECT role FROM farm_members WHERE farm_id = ? AND user_id = ?
    v
hasPermission(role, 'wells:create')
    | checks against PERMISSION_MATRIX
    v
Returns boolean -> component renders/hides UI
```

### CRUD Operation with Role Enforcement (All Three Layers)

```
User creates a well (DashboardPage.handleSaveWell)
    |
    | [Layer 3: Client guard]
    | "New Well" button only shown if hasPermission(role, 'wells:create')
    v
db.execute('INSERT INTO wells ...')           [PowerSync Local Write]
    | immediate optimistic UI update
    | queued in CRUD upload queue
    v
PowerSync uploadData() -> SupabaseConnector   [Sync Layer]
    | sends to Supabase REST API
    v
Supabase processes INSERT                     [Layer 1: RLS]
    | RLS policy: "Members can create wells"
    | checks farm_id IN (SELECT get_user_farm_ids())
    | if role=viewer -> 42501 RLS violation -> permanent error
    | if role=member|admin|owner -> success
    v
SupabaseConnector.applyOperation()
    | if 42501 -> isPermanentError=true -> transaction.complete()
    | (discards the operation, prevents infinite retry)
    v
PowerSync sync-down                          [Layer 2: Sync Rules]
    | well data syncs to all farm members' devices
```

### Key Data Flows

1. **Auth + Auto-Match**: Phone OTP -> `get_onboarding_status()` auto-matches invite -> user lands on dashboard. No manual onboarding steps if invited.
2. **Role-Guarded UI**: `useUserRole()` reads from local SQLite -> `hasPermission()` determines visibility -> components render conditionally.
3. **CRUD with Role Enforcement**: Client-side guard (UI) -> PowerSync local write -> Supabase RLS enforcement (server) -> permanent error handling for unauthorized writes.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 farms (current) | Current architecture is fine. Single PowerSync bucket per farm. RLS helper functions perform well with small `farm_members` table. |
| 100-1K farms | Add PostgreSQL indexes on `farm_members(user_id, farm_id)` (already exist). Monitor RLS policy performance. Consider caching `get_user_farm_ids()` results per transaction with `STABLE` flag (already done). |
| 1K-10K farms | PowerSync sync rules scale linearly with farm count. If a user has many farms, bucket count increases. Cap farms-per-user if needed. Consider `IMMUTABLE` flag on pure helper functions for query planner optimization. |

### Scaling Priorities

1. **First bottleneck: RLS policy evaluation speed.** The `get_user_farm_ids()` and `get_user_admin_farm_ids()` functions are called per-row on every query. The `STABLE` hint allows PostgreSQL to cache per-statement, but under heavy load, consider materializing role lookups in a `MATERIALIZED VIEW` refreshed on `farm_members` changes.
2. **Second bottleneck: PowerSync bucket count.** Each farm membership creates a bucket. With many farms per user, the sync becomes heavier. This is unlikely for agricultural use cases (users typically belong to 1-2 farms).

---

## Anti-Patterns

### Anti-Pattern 1: Client-Only Role Enforcement

**What people do:** Check roles only in React components, skipping RLS policies.
**Why it's wrong:** Any user with browser DevTools can bypass client-side checks. PowerSync local SQLite is accessible via browser DevTools. Without RLS, a modified client can write arbitrary data to any table.
**Do this instead:** Always enforce roles at the Supabase RLS layer. Client-side checks are UX conveniences, not security boundaries.

### Anti-Pattern 2: Storing Roles in JWT Claims

**What people do:** Put the user's role in Supabase Auth JWT metadata (`user_metadata` or `app_metadata`) and check roles via `auth.jwt()` in RLS policies.
**Why it's wrong for this app:** Roles are per-farm, not per-user. A user can be an `owner` in one farm and a `member` in another. JWT claims are global to the user session. Updating JWT claims requires a token refresh. The current approach of reading from `farm_members` table is correct.
**Do this instead:** Keep roles in `farm_members` table, read via `get_user_farm_ids()` / `get_user_admin_farm_ids()` helper functions in RLS policies. This is what the codebase already does.

### Anti-Pattern 3: Mixing Sync Rules and RLS for the Same Concern

**What people do:** Use PowerSync sync rules to restrict what data a user can *write* (e.g., not syncing a table so the user cannot INSERT into it).
**Why it's wrong:** Sync rules only control *read* replication (what data reaches the device). The CRUD upload queue sends writes directly to Supabase, where RLS is the enforcement point. Not syncing a table to the client does NOT prevent the client from writing to it via the upload queue.
**Do this instead:** Use sync rules for *read* access control (what data the user can see). Use Supabase RLS for *write* access control (what data the user can modify).

### Anti-Pattern 4: Blocking PowerSync Upload Queue on Role Errors

**What people do:** Let RLS violations (42501) cause infinite retries in the upload queue, blocking all subsequent operations.
**Why it's wrong:** One failed operation blocks the entire queue. The user cannot sync any data.
**Do this instead:** Classify 42501 as a permanent error (already implemented in `isPermanentError()`), call `transaction.complete()` to discard the operation, and show the user an error notification.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth (Phone OTP) | `supabase.auth.signInWithOtp()` / `verifyOtp()` | Phone format: +1XXXXXXXXXX. Rate limited by Supabase. |
| PowerSync Service | WebSocket connection via `@powersync/web` SDK | Bucket definitions in PowerSync Dashboard. YAML file in `docs/` is documentation only. |
| Twilio (SMS) | Edge Function `send-invite-sms` | Non-critical: SMS failure does not block invite creation. Warning shown to admin. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| AuthProvider <-> Supabase RPCs | Direct Supabase client calls (`supabase.rpc()`) | `get_onboarding_status()` is SECURITY DEFINER with side effects (auto-creates profile + membership) |
| React Components <-> PowerSync | `useQuery()` for reads, `db.execute()` for writes | All reads are local SQLite. All writes go through upload queue. |
| PowerSync Connector <-> Supabase REST | `supabase.from(table).upsert/update/delete()` | RLS enforced on every operation. Permanent errors discarded. |
| Settings UI <-> Permission System | `useUserRole()` + `hasPermission()` | Role check is always local (offline-safe). UI adapts instantly. |

---

## Where Roles Live: The Three-Layer Answer

| Layer | What It Controls | How Roles Are Checked | Offline Behavior |
|-------|-----------------|----------------------|-----------------|
| **Supabase RLS** | Server-side data access (reads + writes) | `get_user_farm_ids()` / `get_user_admin_farm_ids()` functions query `farm_members.role` | N/A -- only runs when connected to Supabase |
| **PowerSync Sync Rules** | What data reaches each device | `parameters:` queries filter by `farm_members.role` (e.g., only `owner`/`admin` get `farm_invites`) | Rules applied during sync. Offline devices keep previously synced data. |
| **Client-Side Guards** | UI visibility, route access | `useUserRole()` queries local `farm_members` table; `hasPermission()` checks permission matrix | Fully offline -- reads from local SQLite. May be stale until next sync. |

### Critical Principle: Client-Side Guards are UX, Not Security

The client-side role check is authoritative for **what the user sees** but not for **what the user can do**. A user with a stale role (e.g., recently demoted from admin to member) will still see admin UI until the next sync, but their CRUD operations will be rejected by Supabase RLS when the upload queue processes. The permanent error handler (`isPermanentError`) discards these operations cleanly.

---

## Build Order: Dependencies Between Components

Based on the analysis above, here is the recommended build order for implementing the full RBAC system:

### Phase 1: Permission Foundation (no UI changes, no migration)
1. **`types/roles.ts`** -- Define `FarmRole` and `Permission` types
2. **`lib/permissions.ts`** -- Permission matrix and `hasPermission()` function
3. **`hooks/useUserRole.ts`** -- Hook to read role from local PowerSync DB

**Rationale:** These are pure TypeScript modules with no external dependencies. They can be built and tested independently. Everything else depends on them.

### Phase 2: Client-Side Route Guards
4. **`components/RequireRole.tsx`** -- Route guard component
5. **Update `App.tsx`** -- Add RequireRole to routes that need it (e.g., settings)
6. **Update existing components** -- Replace inline `role === 'admin'` checks with `hasPermission()` calls (SettingsPage, DashboardPage "New Well" button)

**Rationale:** Depends on Phase 1 (permission types and hook). No backend changes needed.

### Phase 3: Supabase RLS Hardening (migration)
7. **New migration: Add `viewer` role** -- ALTER `farm_members` CHECK constraint to include `'viewer'`
8. **Update RLS policies if needed** -- Current policies use `get_user_farm_ids()` (all members) and `get_user_admin_farm_ids()` (owner + admin). If `viewer` should not create wells, update the well INSERT policy to use `get_user_admin_farm_ids()` or a new helper.
9. **Update `invite_user_by_phone()` RPC** -- Allow `'viewer'` as a valid role parameter

**Rationale:** Depends on the permission matrix (Phase 1) to know what each role can do. RLS changes are independent of client-side code.

### Phase 4: PowerSync Sync Rules Update
10. **Update sync rules YAML** -- If viewers should not see `farm_invites`, no change needed (already restricted to owner/admin). If viewers have different data visibility, add new bucket definitions.
11. **Deploy updated sync rules to PowerSync Dashboard**

**Rationale:** Depends on the role definitions (Phase 1) and RLS policies (Phase 3) to know what data each role should access.

### Phase 5: UI Polish and Role-Aware Components
12. **AddUserModal** -- Add `viewer` option to role picker
13. **PendingInvitesList** -- Show role badge for each invite
14. **Team members list** -- Show current members with their roles, allow role changes (owner only)
15. **DashboardPage** -- Conditionally show/hide "New Well" button based on role

**Rationale:** Depends on all previous phases. These are UI enhancements that consume the permission system.

### Dependency Graph

```
Phase 1: Permission Foundation
    |
    +---> Phase 2: Client-Side Guards (depends on Phase 1)
    |
    +---> Phase 3: Supabase RLS (depends on Phase 1 for permission design)
              |
              +---> Phase 4: Sync Rules (depends on Phase 3 for consistency)
                        |
                        +---> Phase 5: UI Polish (depends on all above)
```

Phases 2 and 3 can be built in parallel since they don't depend on each other (only on Phase 1). Phase 4 should follow Phase 3 for consistency. Phase 5 comes last.

---

## Sources

- PowerSync Sync Rules documentation (Context7, HIGH confidence): https://docs.powersync.com/usage/sync-rules/parameter-queries
- Supabase RLS with SECURITY DEFINER functions (Context7, HIGH confidence): https://supabase.com/docs/guides/auth/row-level-security
- Supabase Custom Claims and RBAC (Context7, HIGH confidence): https://supabase.com/docs/guides/auth/custom-claims-and-role-based-access-control-rbac
- Existing codebase analysis: migrations 007, 008, 010, 011, 017, 018, 019 (HIGH confidence)
- Existing codebase analysis: `powersync-sync-rules.yaml`, `AuthProvider.tsx`, `SettingsPage.tsx`, `powersync-connector.ts` (HIGH confidence)

---
*Architecture research for: Role-based access control in Supabase + PowerSync offline-first PWA*
*Researched: 2026-02-10*
