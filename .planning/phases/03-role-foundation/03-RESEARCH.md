# Phase 3: Role Foundation - Research

**Researched:** 2026-02-10
**Domain:** Database role system, RLS policies, PowerSync sync rules, JWT custom claims
**Confidence:** HIGH

## Summary

Phase 3 transforms the existing 3-role system (`owner`, `admin`, `member`) into a 4-role system (`super_admin`, `grower`, `admin`, `meter_checker`) as specified in ROLE-01. The codebase already has a well-structured foundation: the `farm_members` table with a CHECK constraint on the `role` column, SECURITY DEFINER helper functions (`get_user_farm_ids()`, `get_user_admin_farm_ids()`), private schema pattern for privileged functions, and PowerSync sync rules that filter by `farm_id`. The work is primarily: (1) migrate the CHECK constraint and all references to the new role names, (2) add a permission matrix TypeScript module and `useUserRole` hook, (3) update RLS policies to use the new role names, (4) update PowerSync sync rules, and (5) create a Custom Access Token Hook to inject `role` and `farm_id` into the JWT.

The Custom Access Token Hook is the most technically complex piece. It requires a Postgres function that modifies JWT claims before token issuance, plus manual configuration in the Supabase Dashboard (Authentication > Hooks > Custom Access Token). This hook is needed so PowerSync sync rules can read role/farm_id from `request.jwt()` without additional database queries, and so RLS policies can optionally use `auth.jwt()` for faster permission checks.

**Primary recommendation:** Migrate role names first (database migration), then build the TypeScript permission matrix (client code), then update RLS policies, then sync rules, then the JWT hook -- each plan is independently testable.

## Standard Stack

### Core

No new libraries are needed. Phase 3 operates entirely within the existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (PostgreSQL) | Current | Role storage, RLS policies, JWT hook | Already in use, authoritative data source |
| PowerSync | Current | Sync rules update | Already configured, `request.jwt()` supports custom claims |
| TypeScript | 5.x | Permission matrix, type definitions | Already in use for all client code |
| `@powersync/react` | Current | `useQuery` for role lookup hook | Already in use for all data queries |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | -- | -- | No new dependencies needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Access Token Hook | `app_metadata` via Supabase admin API | Requires service_role key call on every role change; Hook is more reliable and automatic |
| TypeScript enum for roles | String literal union type | Enum adds runtime overhead; literal union is sufficient and tree-shakeable |
| RLS policy per role | Helper functions with role checks | Helper functions already exist; avoid policy explosion |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── permissions.ts       # Permission matrix, role types, hasPermission()
├── hooks/
│   └── useUserRole.ts       # Hook returning current user's role from PowerSync
├── types/
│   └── roles.ts             # Role and Permission type exports (re-exported from permissions.ts)
supabase/
└── migrations/
    ├── 021_four_role_system.sql      # Role constraint migration
    ├── 022_rls_policy_updates.sql    # Updated RLS policies
    └── 023_custom_access_token_hook.sql  # JWT claims injection
docs/
└── powersync-sync-rules.yaml        # Updated sync rules documentation
```

### Pattern 1: Centralized Permission Matrix

**What:** A single TypeScript module that defines all roles, all actions, and a lookup function. All client code imports from this one source.
**When to use:** Always -- every permission check in the entire app goes through this module.
**Example:**
```typescript
// Source: Project convention, standard RBAC pattern
export const ROLES = ['super_admin', 'grower', 'admin', 'meter_checker'] as const;
export type Role = (typeof ROLES)[number];

export type Action =
  | 'manage_farm'
  | 'manage_users'
  | 'manage_wells'
  | 'create_well'
  | 'record_reading'
  | 'view_wells'
  | 'view_members'
  | 'manage_invites'
  | 'cross_farm_access';

const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  super_admin: new Set([
    'manage_farm', 'manage_users', 'manage_wells', 'create_well',
    'record_reading', 'view_wells', 'view_members', 'manage_invites',
    'cross_farm_access',
  ]),
  grower: new Set([
    'manage_farm', 'manage_users', 'manage_wells', 'create_well',
    'record_reading', 'view_wells', 'view_members', 'manage_invites',
  ]),
  admin: new Set([
    'manage_users', 'manage_wells', 'create_well',
    'record_reading', 'view_wells', 'view_members', 'manage_invites',
  ]),
  meter_checker: new Set([
    'record_reading', 'view_wells', 'view_members',
  ]),
};

export function hasPermission(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

export function isAdminOrAbove(role: Role | null | undefined): boolean {
  return role === 'super_admin' || role === 'grower' || role === 'admin';
}
```

### Pattern 2: useUserRole Hook

**What:** A React hook that queries the current user's role from the `farm_members` table in PowerSync.
**When to use:** Any component that needs to check permissions or display role-specific UI.
**Example:**
```typescript
// Source: Project convention, follows existing useUserProfile pattern
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';
import type { Role } from '../lib/permissions';

interface RoleRow {
  role: string;
}

export function useUserRole(): Role | null {
  const { user, onboardingStatus } = useAuth();
  const userId = user?.id ?? null;
  const farmId = onboardingStatus?.farmId ?? null;

  const query = userId && farmId
    ? 'SELECT role FROM farm_members WHERE user_id = ? AND farm_id = ?'
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<RoleRow>(query, userId && farmId ? [userId, farmId] : []);

  return useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[0].role as Role;
  }, [data]);
}
```

### Pattern 3: Custom Access Token Hook

**What:** A Postgres function that runs before every JWT issuance, injecting `user_role` and `farm_id` into the token claims.
**When to use:** Once, as a database migration + Supabase Dashboard configuration.
**Example:**
```sql
-- Source: Supabase official docs (custom-access-token-hook.mdx)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_user_id uuid;
  v_role text;
  v_farm_id uuid;
BEGIN
  v_user_id := (event->>'user_id')::uuid;

  -- Get user's primary farm membership (first farm joined)
  SELECT fm.role, fm.farm_id
  INTO v_role, v_farm_id
  FROM public.farm_members fm
  WHERE fm.user_id = v_user_id
  ORDER BY fm.created_at ASC
  LIMIT 1;

  claims := event->'claims';

  -- Ensure app_metadata exists
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject role and farm_id
  IF v_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{app_metadata, farm_id}', to_jsonb(v_farm_id::text));
  ELSE
    claims := jsonb_set(claims, '{app_metadata, user_role}', 'null');
    claims := jsonb_set(claims, '{app_metadata, farm_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

### Pattern 4: Role Migration with Data Preservation

**What:** ALTER the CHECK constraint and UPDATE existing data in a single migration.
**When to use:** When changing role names in `farm_members` and `farm_invites`.
**Example:**
```sql
-- Source: Standard PostgreSQL migration pattern
-- Step 1: Map old roles to new roles
UPDATE farm_members SET role = 'grower' WHERE role = 'owner';
-- 'admin' stays 'admin'
UPDATE farm_members SET role = 'meter_checker' WHERE role = 'member';

-- Step 2: Drop old constraint, add new one
ALTER TABLE farm_members DROP CONSTRAINT IF EXISTS farm_members_role_check;
ALTER TABLE farm_members ADD CONSTRAINT farm_members_role_check
  CHECK (role IN ('super_admin', 'grower', 'admin', 'meter_checker'));
```

### Anti-Patterns to Avoid

- **Hardcoded role strings scattered across components:** Every role check should go through `hasPermission()` or `isAdminOrAbove()`. Never write `if (role === 'admin')` directly in a component.
- **RLS policies that query farm_members directly instead of using helper functions:** Always use `get_user_farm_ids()` and `get_user_admin_farm_ids()` to avoid RLS recursion. These SECURITY DEFINER functions bypass RLS safely.
- **Trying to use JOINs in PowerSync sync rules:** PowerSync sync rules only support single-table SELECT with WHERE filters. Use parameter queries to establish bucket parameters, then simple data queries.
- **Creating the JWT hook without the dashboard configuration:** The SQL function alone does nothing. You MUST enable it in the Supabase Dashboard under Authentication > Hooks > Custom Access Token. This is a manual step.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role validation | Custom validation logic | PostgreSQL CHECK constraint | DB-level enforcement, impossible to bypass |
| RLS farm_id lookup | Direct `farm_members` query in RLS | `get_user_farm_ids()` helper function | Avoids RLS recursion, already exists |
| JWT claims injection | Client-side role lookup + manual token manipulation | Custom Access Token Hook | Runs automatically on every token issuance, server-side |
| Permission checking | Inline `if (role === 'X')` checks | Centralized `hasPermission()` function | Single source of truth, easy to update |

**Key insight:** The database is the enforcement layer (CHECK constraints, RLS). The client-side permission matrix is for UI gating only -- it must mirror the database rules but never be the sole line of defense.

## Common Pitfalls

### Pitfall 1: Role Migration Breaking Existing Data

**What goes wrong:** Changing the CHECK constraint before updating existing rows causes a constraint violation and the migration fails.
**Why it happens:** PostgreSQL validates existing data when you add a new CHECK constraint.
**How to avoid:** Always UPDATE existing data to new role names FIRST, then drop the old constraint and add the new one. Wrap in a transaction.
**Warning signs:** Migration fails with `ERROR: check constraint ... is violated by some row`.

### Pitfall 2: Forgetting to Update farm_invites Role Constraint

**What goes wrong:** `farm_invites.role` has its own CHECK constraint (`CHECK (role IN ('admin', 'member'))`). If you only update `farm_members`, invites will still use the old roles.
**Why it happens:** Two separate tables have independent role constraints.
**How to avoid:** Update both `farm_members.role` and `farm_invites.role` constraints in the same migration. Map `member` to `meter_checker` in farm_invites.
**Warning signs:** New invites fail because the role value doesn't pass the farm_invites CHECK constraint.

### Pitfall 3: Custom Access Token Hook Permissions

**What goes wrong:** The hook function exists but doesn't run, or returns an error, causing all logins to fail.
**Why it happens:** The `supabase_auth_admin` role needs explicit permissions: `GRANT EXECUTE` on the function, `GRANT SELECT` on `farm_members`, and a permissive RLS policy for `supabase_auth_admin`.
**How to avoid:** Always include the full grant/revoke/policy block in the migration. Test by logging in after enabling the hook.
**Warning signs:** Login fails with a generic auth error. Check Supabase Auth logs in Dashboard.

### Pitfall 4: RLS Recursion When Updating Helper Functions

**What goes wrong:** Updating `get_user_farm_ids()` or `get_user_admin_farm_ids()` to include new role names could introduce recursion if done incorrectly.
**Why it happens:** These functions are SECURITY DEFINER and bypass RLS. If you accidentally change them to SECURITY INVOKER, RLS kicks in and causes infinite recursion.
**How to avoid:** Always keep these functions as SECURITY DEFINER. When updating, use `CREATE OR REPLACE` and verify the SECURITY DEFINER attribute is preserved.
**Warning signs:** Any RLS-protected query hangs or returns a "stack depth limit exceeded" error.

### Pitfall 5: PowerSync Sync Rule "owner" References

**What goes wrong:** The existing sync rules reference `role = 'owner'` for invite bucket filtering. After renaming to `grower`, these rules return no data.
**Why it happens:** Sync rules are configured in the PowerSync Dashboard, not in code. They must be manually updated to match the new role names.
**How to avoid:** Update the sync rules YAML documentation AND the PowerSync Dashboard at the same time as the database migration. Test sync after deployment.
**Warning signs:** Invites disappear from the local database for grower users after migration.

### Pitfall 6: Multi-Farm Membership Complication for JWT Hook

**What goes wrong:** The Custom Access Token Hook injects a single `farm_id` into the JWT, but a user could belong to multiple farms (e.g., super_admin).
**Why it happens:** JWT claims are static for the token lifetime. If a user switches farms, the JWT still has the old farm_id until token refresh.
**How to avoid:** For v1, inject the PRIMARY farm (first joined, i.e., `ORDER BY created_at ASC LIMIT 1`). Document that multi-farm is v2 scope. For super_admin, the JWT farm_id is their "home" farm; cross-farm access is handled by RLS policies in Phase 4, not by JWT claims.
**Warning signs:** Super admin can't see other farms' data. This is expected in Phase 3 -- cross-farm access is Phase 4 scope.

## Code Examples

Verified patterns from official sources:

### Accessing JWT Claims in PowerSync Sync Rules

```yaml
# Source: PowerSync official docs (parameter-queries)
# Access custom claims injected by Supabase Custom Access Token Hook
bucket_definitions:
  farm_data:
    parameters: |
      SELECT request.jwt() ->> 'app_metadata.farm_id' AS farm_id
    data:
      - SELECT * FROM wells WHERE farm_id = bucket.farm_id
```

**Note:** This pattern uses `request.jwt() ->> 'app_metadata.farm_id'` to read the custom claim. The `->>` operator extracts a text value from the JSON path. PowerSync supports dot notation for nested paths.

### Accessing JWT Claims in Supabase RLS Policies

```sql
-- Source: Supabase official docs (custom-claims-and-role-based-access-control-rbac.mdx)
-- Read custom claims from JWT in RLS policies
-- This is OPTIONAL for Phase 3 -- existing helper functions work fine
-- But can be used for performance optimization (avoids the farm_members lookup)
CREATE POLICY "Members can view farm wells"
    ON wells FOR SELECT
    USING (
        farm_id = ((auth.jwt() -> 'app_metadata' ->> 'farm_id')::uuid)
    );
```

### Granting Permissions for Custom Access Token Hook

```sql
-- Source: Supabase official docs (custom-access-token-hook.mdx)
-- CRITICAL: These grants are required for the hook to work

-- Allow supabase_auth_admin to execute the hook function
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Prevent direct invocation by regular users
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Allow the hook to read farm_members (needed to look up role)
GRANT SELECT ON TABLE public.farm_members TO supabase_auth_admin;

-- RLS policy so supabase_auth_admin can read farm_members
CREATE POLICY "Allow auth admin to read farm_members"
    ON farm_members AS PERMISSIVE FOR SELECT
    TO supabase_auth_admin USING (true);
```

### Updating get_user_admin_farm_ids for New Roles

```sql
-- Source: Existing codebase pattern (migration 011)
-- Update to use new role names: 'grower' replaces 'owner', 'admin' stays 'admin'
CREATE OR REPLACE FUNCTION get_user_admin_farm_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT farm_id
    FROM farm_members
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'grower', 'admin')
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `app_metadata` for custom claims | Custom Access Token Hook | Supabase Auth Hooks GA (2024) | No more service_role key calls; automatic claim injection |
| Direct `farm_members` lookup in RLS | SECURITY DEFINER helper functions | Migration 011 (already done) | No RLS recursion, cleaner policies |
| `owner/admin/member` roles | `super_admin/grower/admin/meter_checker` roles | This phase | Finer-grained access control matching agricultural domain |
| Simple `request.user_id()` in sync rules | `request.jwt() ->> 'app_metadata.X'` available | PowerSync (current) | Can optionally use JWT claims for sync rule filtering |

**Deprecated/outdated:**
- `app_metadata` approach: Requires calling Supabase admin API with service_role key every time a role changes. Custom Access Token Hook is the recommended approach.
- `public.generate_random_code()`: Already removed in migration 020. Fully private now.

## Open Questions

1. **Super admin: database user or application-level concept?**
   - What we know: ROLE-05 says "Super admin can see and manage all farms." The JWT hook injects one farm_id. Cross-farm access is Phase 4.
   - What's unclear: Should super_admin be stored in `farm_members` (linked to a specific farm) or in a separate table/flag? If in farm_members, a super_admin is always associated with one farm but can access others.
   - Recommendation: Store `super_admin` as a role in `farm_members` like any other role. Phase 4 will handle cross-farm access via RLS policies that grant super_admin access to all farms. This is simpler and reuses existing infrastructure.

2. **Should RLS policies be updated to use JWT claims directly?**
   - What we know: Current RLS policies use `get_user_farm_ids()` helper function which queries `farm_members`. JWT claims would skip this lookup.
   - What's unclear: Performance difference is likely negligible for this app's scale. JWT-based RLS means role changes don't take effect until the next token refresh (~1 hour by default).
   - Recommendation: Keep existing helper function pattern for RLS in Phase 3. It's proven, works now, and reflects real-time role data. JWT claims are useful for PowerSync sync rules (which already use JWT) but not critical for RLS. Optionally add JWT-based RLS in a future optimization pass.

3. **Existing `users` table role column**
   - What we know: The `users` table has a `role` column (from migration 001 with CHECK `role IN ('admin', 'member')`). The `useUserProfile` hook reads `users.role`. But the authoritative role is now in `farm_members.role`.
   - What's unclear: Is `users.role` still used anywhere? It appears to be a legacy column.
   - Recommendation: Leave `users.role` alone in Phase 3 (don't drop it, don't update its constraint). Update `useUserProfile` to NOT return role from `users` table, and ensure all role checks use `farm_members` via `useUserRole`. Dropping the column can be a later cleanup task.

4. **Dashboard hook enablement is a manual step**
   - What we know: The Custom Access Token Hook SQL function is created via migration, but it must be manually enabled in the Supabase Dashboard under Authentication > Hooks.
   - What's unclear: There's no CLI or migration-based way to enable the hook.
   - Recommendation: Document the manual step clearly in the plan. Include it as a verification step. The hook function is safe to create even before enabling -- it simply won't run until enabled.

## Sources

### Primary (HIGH confidence)

- Context7 `/supabase/supabase` - Custom Access Token Hook implementation, grants, policies
- Context7 `/llmstxt/powersync_llms-full_txt` - Sync rules parameter queries, `request.jwt()` usage, SQL subset limitations
- Supabase official docs (`custom-access-token-hook.mdx`) - Hook configuration, claim injection pattern
- Supabase official docs (`custom-claims-and-role-based-access-control-rbac.mdx`) - RBAC pattern with custom claims

### Secondary (MEDIUM confidence)

- PowerSync docs (`parameter-queries`, `operators-and-functions`) - Sync rule operators (`=`, `IN`, `IS NULL`), no JOINs in data queries
- PowerSync docs (sync-rules) - `request.jwt() ->> 'app_metadata.X'` for accessing nested JWT claims

### Tertiary (LOW confidence)

- None -- all findings verified with official documentation

## Existing Codebase State (Critical for Planning)

### Current Role System (must be migrated)

| Table | Column | Current Constraint | New Constraint |
|-------|--------|-------------------|----------------|
| `farm_members` | `role` | `CHECK (role IN ('owner', 'admin', 'member'))` | `CHECK (role IN ('super_admin', 'grower', 'admin', 'meter_checker'))` |
| `farm_invites` | `role` | `CHECK (role IN ('admin', 'member'))` | `CHECK (role IN ('admin', 'meter_checker'))` |

### Role Name Mapping

| Old Role | New Role | Notes |
|----------|----------|-------|
| `owner` | `grower` | Farm creator/owner |
| `admin` | `admin` | No change |
| `member` | `meter_checker` | Field worker who records readings |
| (new) | `super_admin` | System-wide admin, cross-farm access |

### Existing Helper Functions (must be updated)

| Function | Location | Change Needed |
|----------|----------|---------------|
| `get_user_farm_ids()` | Migration 011, moved to private in 020 | No change needed (returns all farms regardless of role) |
| `get_user_admin_farm_ids()` | Migration 011, moved to private in 020 | UPDATE: change `IN ('owner', 'admin')` to `IN ('super_admin', 'grower', 'admin')` |
| `create_farm_and_membership_impl()` | Migration 020 | UPDATE: change `'owner'` to `'grower'` in INSERT |
| `join_farm_with_code_impl()` | Migration 020 | No change needed (uses role from invite) |
| `create_invite_code_impl()` | Migration 020 | UPDATE: change role validation from `('admin', 'member')` to `('admin', 'meter_checker')` |
| `invite_user_by_phone_impl()` | Migration 020 | UPDATE: change role validation from `('admin', 'member')` to `('admin', 'meter_checker')` |
| `get_onboarding_status_impl()` | Migration 020 | No change needed (uses role from invite, doesn't validate role value) |

### Existing RLS Policies (must update role references)

Most RLS policies use `get_user_farm_ids()` and `get_user_admin_farm_ids()` -- they don't reference role names directly. The helper functions are the only place role names appear in RLS logic. Updating the helper functions propagates the change to all policies automatically.

### Existing PowerSync Sync Rules (must update role references)

The sync rules reference `role = 'owner'` and `role = 'admin'` in the `farm_invites_owner` and `farm_invites_admin` bucket parameter queries. These must be updated to `role = 'grower'` and `role = 'admin'` respectively. A new bucket for `super_admin` invite access should be added.

### Client Code Using Roles (must be updated)

| File | Current Role References | Change Needed |
|------|------------------------|---------------|
| `src/pages/SettingsPage.tsx` | `role === 'owner' \|\| role === 'admin'` | Use `isAdminOrAbove()` from permissions module |
| `src/components/AddUserModal.tsx` | `Role = 'member' \| 'admin'` | Change to `'meter_checker' \| 'admin'` |
| `src/hooks/useUserProfile.ts` | Returns `role` from `users` table | Should not return role; role comes from `useUserRole` |

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, all existing infrastructure
- Architecture: HIGH - Permission matrix pattern is standard RBAC, well-documented
- Pitfalls: HIGH - Identified from codebase analysis and official Supabase docs
- Custom Access Token Hook: HIGH - Verified with Context7 and official Supabase docs
- PowerSync sync rules: HIGH - Verified `request.jwt()` syntax with Context7

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no fast-moving dependencies)
