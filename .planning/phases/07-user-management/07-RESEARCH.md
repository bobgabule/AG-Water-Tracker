# Phase 7: User Management - Research

**Researched:** 2026-02-11
**Domain:** User management UI, user disable/enable (soft-ban), profile self-edit
**Confidence:** HIGH

## Summary

Phase 7 adds user management capabilities to the existing UsersPage (`/users`) and SettingsPage (`/settings`). The codebase already has substantial infrastructure in place: the UsersPage renders a member list with role display names and delete capability, the SettingsPage has a working profile edit form (first name, last name, email), and the permissions module defines `manage_users` action checks. The primary net-new work is: (1) adding a disable/enable mechanism for farm members, (2) adding a "Show disabled users" toggle with visual indicators, and (3) improving the existing role badges.

The biggest architectural decision is **how to implement user disable**. Two approaches exist: (A) Supabase Auth's `ban_duration` on `auth.users.banned_until` (prevents login at the auth layer), or (B) an application-level `is_disabled` flag on `farm_members` (prevents access at the app/sync layer). **Recommendation: Use `farm_members.is_disabled` (INTEGER 0/1)** because: it's per-farm (a user disabled from Farm A can still access Farm B), it's visible to PowerSync sync rules, it doesn't require service_role key access, and it follows the existing pattern where `farm_members` is the authoritative membership table.

**Primary recommendation:** Add `is_disabled INTEGER DEFAULT 0` to `farm_members`, create `disable_farm_member` and `enable_farm_member` RPCs in the private schema pattern, filter disabled users in the PowerSync query + UI toggle, and polish the existing SettingsPage profile form.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI framework | Already in use |
| @powersync/react | latest | `useQuery` for offline-first data | Already in use |
| @headlessui/react | v2 | Accessible Dialog, Switch components | Already in use for bottom sheets and modals |
| @heroicons/react | latest | Icons (outline/solid) | Already in use |
| Zustand | v5 | UI state (if needed for toggle persistence) | Already in use |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase-js | latest | RPC calls for disable/enable | Already used for all server mutations |
| Tailwind CSS | v4 | Styling | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `farm_members.is_disabled` flag | Supabase Auth `ban_duration` | Auth ban is global (all farms), requires service_role key, can't be queried by PowerSync. App-level flag is per-farm, queryable, follows existing patterns. |
| Client-side toggle state | Zustand store | Simple `useState` in UsersPage is sufficient since toggle doesn't need to persist across navigation. |

**Installation:** No new packages needed.

## Architecture Patterns

### Existing Project Structure (relevant files)
```
src/
  pages/
    UsersPage.tsx          # EXISTS - member list, delete, invite
    SettingsPage.tsx        # EXISTS - profile edit form (first/last/email)
  components/
    AddUserModal.tsx        # EXISTS - invite bottom sheet
    ConfirmDeleteMemberDialog.tsx  # EXISTS - delete confirmation
    PendingInvitesList.tsx  # EXISTS - pending invites display
    RequireRole.tsx         # EXISTS - route guard
    SideMenu.tsx            # EXISTS - nav with role filtering
  hooks/
    useUserRole.ts          # EXISTS - current user's role from farm_members
    useUserProfile.ts       # EXISTS - current user's profile from users table
  lib/
    permissions.ts          # EXISTS - PERMISSION_MATRIX, hasPermission()
    powersync-schema.ts     # EXISTS - PowerSync schema definitions
    powersync-connector.ts  # EXISTS - CRUD upload handler
  stores/
    activeFarmStore.ts      # EXISTS - super_admin farm override
supabase/
  migrations/
    029_disable_farm_member.sql  # NEW - add is_disabled + RPCs
```

### Pattern 1: Disable/Enable via `farm_members.is_disabled` Column
**What:** Add `is_disabled INTEGER DEFAULT 0` to `farm_members`. Create `disable_farm_member` and `enable_farm_member` RPCs following the private schema pattern.
**When to use:** For all disable/enable operations.
**Why INTEGER not BOOLEAN:** PowerSync doesn't support BOOLEAN type (documented in MEMORY.md). Use 0/1 and convert as needed.

```sql
-- Migration pattern (follows existing migrations 020-028)
ALTER TABLE farm_members ADD COLUMN IF NOT EXISTS is_disabled INTEGER NOT NULL DEFAULT 0;

-- Private implementation
CREATE OR REPLACE FUNCTION private.disable_farm_member_impl(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cannot disable yourself
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot disable yourself';
    END IF;

    -- Get caller role, verify permissions, enforce hierarchy
    -- (same pattern as remove_farm_member_impl in migration 027)
    ...

    UPDATE public.farm_members
    SET is_disabled = 1
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- Public SECURITY DEFINER wrapper
CREATE OR REPLACE FUNCTION public.disable_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.disable_farm_member_impl(p_farm_id, p_member_user_id);
$$;

-- GRANT + NOTIFY pattern
GRANT EXECUTE ON FUNCTION public.disable_farm_member(uuid, uuid) TO authenticated, anon, public;
NOTIFY pgrst, 'reload schema';
```

### Pattern 2: PowerSync Query with Disable Filter
**What:** Query farm_members with optional `is_disabled` filter.
**Source:** Existing PowerSync query pattern in UsersPage.tsx.

```typescript
// Active members only (default view)
const { data: rawMembers } = useQuery<FarmMemberRow>(
  farmId
    ? 'SELECT id, user_id, role, full_name, is_disabled, created_at FROM farm_members WHERE farm_id = ? AND is_disabled = 0 ORDER BY created_at ASC'
    : 'SELECT NULL WHERE 0',
  farmId ? [farmId] : []
);

// All members (when "Show disabled" toggle is on)
const { data: rawMembers } = useQuery<FarmMemberRow>(
  farmId
    ? 'SELECT id, user_id, role, full_name, is_disabled, created_at FROM farm_members WHERE farm_id = ? ORDER BY created_at ASC'
    : 'SELECT NULL WHERE 0',
  farmId ? [farmId] : []
);
```

### Pattern 3: Existing RPC Call Pattern (from UsersPage.tsx)
**What:** Follow the same `supabase.rpc()` + error handling pattern used for `remove_farm_member`.
**Source:** `src/pages/UsersPage.tsx` lines 64-98.

```typescript
const { error: rpcError } = await supabase.rpc('disable_farm_member', {
  p_farm_id: farmId,
  p_member_user_id: member.user_id,
});
if (rpcError) throw rpcError;
```

### Pattern 4: Profile Update (Already Implemented)
**What:** SettingsPage already has a complete profile edit form using `supabase.from('users').update()`.
**Source:** `src/pages/SettingsPage.tsx` lines 84-122.
**Note:** This satisfies USER-08 as-is. The form has first_name, last_name, email fields with validation and save/cancel UX. Minor improvements may be needed (e.g., the `full_name` trigger on `farm_members` syncs from `display_name`, which auto-updates from first_name/last_name via the `auto_display_name` trigger).

### Anti-Patterns to Avoid
- **Using Supabase Auth `ban_duration` for per-farm disable:** The ban is global across all auth -- if a user belongs to multiple farms, banning them affects all farms. Use app-level `is_disabled` on `farm_members` instead.
- **Direct `auth.users` table manipulation from client:** Never modify `auth.users` directly. Use admin API (service_role) or RPC functions.
- **Forgetting `GRANT EXECUTE` after creating new functions:** PostgREST returns 404 (not 403) when the function exists but the role lacks EXECUTE permission (documented in MEMORY.md).
- **Using `SECURITY INVOKER` on public wrappers:** The private schema has USAGE revoked from authenticated/anon/public. All public wrappers MUST be `SECURITY DEFINER` (lesson from migrations 023, 028).
- **Using BOOLEAN type in PowerSync schema:** PowerSync doesn't support BOOLEAN. Use `column.integer` and store 0/1.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role badge colors | Custom color-mapping logic | Extend existing `ROLE_DISPLAY_NAMES` with a `ROLE_BADGE_STYLES` map in `permissions.ts` | Single source of truth, already used in SettingsPage role display |
| Toggle component | Custom checkbox/switch | Headless UI `Switch` component | Accessible, keyboard-navigable, already installed |
| Confirmation dialog | Custom modal | Extend existing `ConfirmDeleteMemberDialog` pattern | Consistent UX, already proven pattern |
| Permission checks | Inline role string comparisons | `hasPermission(role, 'manage_users')` from `permissions.ts` | Already the standard pattern |

**Key insight:** Almost all UI building blocks already exist in the codebase. The primary work is wiring up new RPCs and adjusting the existing UsersPage to support disable/enable + toggle.

## Common Pitfalls

### Pitfall 1: Disabled User Can Still Access Data via PowerSync
**What goes wrong:** A disabled user's local PowerSync database still contains all synced data until they go online and the sync rules exclude them.
**Why it happens:** PowerSync syncs data based on `farm_members` rows. If `is_disabled = 1` but the sync rule still includes the row, data remains accessible.
**How to avoid:** The sync rules filter should check `is_disabled = 0` in the parameter query OR in the data query. However, for the "show disabled users" admin view, the farm_members row itself must still sync. **Recommended approach:** Keep syncing `farm_members` rows (including disabled ones) so admins can see the list, but modify sync rules for OTHER tables (wells, farms) to exclude disabled members. Alternatively, the simpler approach is to NOT modify sync rules and instead handle the login block client-side by checking the member's `is_disabled` status in the auth flow.
**Warning signs:** Disabled user reports they can still see farm data after being disabled.

### Pitfall 2: full_name Trigger Uses display_name, Not first_name/last_name Directly
**What goes wrong:** Updating first_name/last_name on the `users` table auto-updates `display_name` (via `auto_display_name` trigger from migration 003), but the `sync_farm_member_full_name` trigger (migration 012) watches `display_name` and `phone` columns. So the chain is: `first_name/last_name` -> `auto_display_name` trigger -> `display_name` -> `sync_farm_member_full_name` trigger -> `farm_members.full_name`.
**Why it happens:** Migration 012 was written before first/last name columns existed.
**How to avoid:** Verify the trigger chain works correctly by testing. If `auto_display_name` fires BEFORE the row is saved (it's a BEFORE trigger), then the updated `display_name` should be visible to the AFTER trigger on `users`. This should work as-is, but needs verification.
**Warning signs:** User updates their name in Settings but their name in the Users list doesn't change.

### Pitfall 3: Forgetting to Add `is_disabled` to PowerSync Schema
**What goes wrong:** Adding `is_disabled` column to PostgreSQL but forgetting to add it to `powersync-schema.ts` means the column won't sync to clients.
**Why it happens:** PowerSync schema is separate from the database schema.
**How to avoid:** Checklist: (1) migration adds column, (2) `powersync-schema.ts` adds `column.integer`, (3) sync rules YAML updated, (4) sync rules deployed to PowerSync dashboard.

### Pitfall 4: Race Condition in Settings Profile Save
**What goes wrong:** The existing SettingsPage saves directly via `supabase.from('users').update()`. While the user is offline (PowerSync mode), this call will fail because it goes directly to Supabase, not through PowerSync.
**Why it happens:** The profile update bypasses PowerSync's offline-first architecture.
**How to avoid:** For Phase 7, this is acceptable since profile edits are low-frequency and require connectivity. Document this as a known limitation. A future enhancement could route profile updates through PowerSync's CRUD queue.
**Warning signs:** User tries to edit profile while offline and gets an error.

### Pitfall 5: Disabled User Session Handling
**What goes wrong:** A user who is currently logged in and gets disabled won't know until they try to perform an action or the app checks their status.
**Why it happens:** There's no push mechanism to force-logout a disabled user. Their existing session/JWT remains valid.
**How to avoid:** Two approaches: (A) Check `is_disabled` on the `farm_members` row in the auth flow (e.g., in `RequireOnboarded` or a new `RequireActiveMembership` guard), or (B) rely on the next token refresh -- modify the `custom_access_token_hook` to set null claims when the user is disabled. **Recommended:** Option A is simpler and faster. On each page load, if the current user's `farm_members.is_disabled = 1`, show a "Your account has been disabled" message and sign them out.
**Warning signs:** Disabled user continues to use the app until their session expires.

## Code Examples

### Example 1: Disable/Enable RPC Calls (Client-Side)
```typescript
// Source: Pattern from existing remove_farm_member usage in UsersPage.tsx
const handleDisable = useCallback(async (member: FarmMemberRow) => {
  if (!farmId) return;
  try {
    setLoading(true);
    const { error } = await supabase.rpc('disable_farm_member', {
      p_farm_id: farmId,
      p_member_user_id: member.user_id,
    });
    if (error) throw error;
  } catch (err: unknown) {
    // Error handling pattern from UsersPage.tsx
  } finally {
    setLoading(false);
  }
}, [farmId]);

const handleEnable = useCallback(async (member: FarmMemberRow) => {
  if (!farmId) return;
  try {
    setLoading(true);
    const { error } = await supabase.rpc('enable_farm_member', {
      p_farm_id: farmId,
      p_member_user_id: member.user_id,
    });
    if (error) throw error;
  } catch (err: unknown) {
    // Same error handling
  } finally {
    setLoading(false);
  }
}, [farmId]);
```

### Example 2: Toggle with Headless UI Switch
```typescript
// Source: @headlessui/react v2 Switch pattern
import { Switch } from '@headlessui/react';

<Switch
  checked={showDisabled}
  onChange={setShowDisabled}
  className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-[checked]:bg-[#5f7248]"
>
  <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-[checked]:translate-x-6" />
</Switch>
```

### Example 3: Role Badge Styling Map
```typescript
// Source: Existing pattern in SettingsPage.tsx lines 272-280
export const ROLE_BADGE_STYLES: Record<Role, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  grower: 'bg-green-100 text-green-700',
  admin: 'bg-yellow-100 text-yellow-700',
  meter_checker: 'bg-blue-100 text-blue-700',
};
```

### Example 4: Disabled User Visual Indicator
```typescript
// Disabled member row with opacity and visual indicator
<div className={`rounded-lg px-4 py-3 flex items-center justify-between ${
  member.is_disabled ? 'bg-gray-200 opacity-60' : 'bg-[#dfe4d4]'
}`}>
  <span className={`font-medium truncate ${
    member.is_disabled ? 'text-gray-500 line-through' : 'text-[#5f7248]'
  }`}>
    {member.full_name || 'Unknown'}
    {member.is_disabled && (
      <span className="text-xs ml-2 text-red-500 no-underline">(Disabled)</span>
    )}
  </span>
</div>
```

### Example 5: Migration Pattern (Private Schema + Public Wrapper)
```sql
-- Source: Exact pattern from migrations 027 + 028

-- 1. Private impl (SECURITY DEFINER, SET search_path = '')
CREATE OR REPLACE FUNCTION private.disable_farm_member_impl(p_farm_id UUID, p_member_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ ... $$;

-- 2. Public wrapper (SECURITY DEFINER, delegates to private)
CREATE OR REPLACE FUNCTION public.disable_farm_member(p_farm_id UUID, p_member_user_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    SELECT private.disable_farm_member_impl(p_farm_id, p_member_user_id);
$$;

-- 3. GRANT + NOTIFY (MANDATORY)
GRANT EXECUTE ON FUNCTION public.disable_farm_member(uuid, uuid) TO authenticated, anon, public;
NOTIFY pgrst, 'reload schema';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Delete user (cascade) | Soft disable via `is_disabled` flag | This phase | Historical data preserved |
| Global auth ban (`banned_until`) | Per-farm disable flag | This phase | Multi-farm compatible |
| `SECURITY INVOKER` wrappers | `SECURITY DEFINER` wrappers | Migration 023/028 | All new functions must use DEFINER |
| Single `invited_name` | Separate `first_name`/`last_name` | Migration 026 | Profile edit updates both fields |

**Deprecated/outdated:**
- `farms.invite_code` column: Dropped in migration 024. Not relevant here but good to remember.
- Old 3-role system (`owner`/`admin`/`member`): Replaced by 4-role system in migration 021.

## Existing Implementation Inventory

### Already Fully Implemented (USER-08)
The SettingsPage (`src/pages/SettingsPage.tsx`) already has a complete profile self-edit form:
- Edit button toggles between display and edit mode
- First name, last name, email input fields
- Validation (first/last name required, email optional)
- Save via `supabase.from('users').update()` with loading/error/success states
- Success message auto-clears after 3 seconds
- The `auto_display_name` trigger chain syncs changes to `farm_members.full_name`

**Remaining work for USER-08:** Minimal. Possibly just verify the trigger chain works and consider matching the page's dark theme to the rest of the app (UsersPage uses green theme, SettingsPage uses gray-900 dark theme -- this is a design choice, not a bug).

### Already Partially Implemented (USER-01)
The UsersPage (`src/pages/UsersPage.tsx`) already has:
- Member list from PowerSync query on `farm_members`
- Role display names via `ROLE_DISPLAY_NAMES` map
- "(You)" indicator for current user
- Delete (remove) member functionality with confirmation dialog
- "New User" invite button at bottom
- Pending invites section

**Remaining work for USER-01:** Add proper role badges (colored pills instead of plain text), improve visual styling to match design specs.

### Not Yet Implemented
- **USER-02:** No `is_disabled` column exists, no toggle UI
- **USER-06:** No disable RPC, no disable UI action
- **USER-07:** No enable RPC, no enable UI action

## Database Schema Analysis

### Current `farm_members` Table (after all migrations)
```
id          UUID PK
farm_id     UUID FK -> farms(id) ON DELETE CASCADE
user_id     UUID FK -> auth.users(id) ON DELETE CASCADE
role        TEXT CHECK (role IN ('super_admin', 'grower', 'admin', 'meter_checker'))
full_name   TEXT (denormalized from users.display_name via trigger)
created_at  TIMESTAMPTZ
UNIQUE(farm_id, user_id)
```

### Current `users` Table (after all migrations)
```
id           UUID PK FK -> auth.users(id) ON DELETE CASCADE
phone        TEXT
first_name   TEXT
last_name    TEXT
email        TEXT
display_name TEXT (auto-populated from first_name + ' ' + last_name via trigger)
created_at   TIMESTAMPTZ
updated_at   TIMESTAMPTZ
```

### Required Schema Change
```
farm_members: ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0
```

### PowerSync Schema Change Required
```typescript
// In powersync-schema.ts, farm_members table:
is_disabled: column.integer,  // NEW - 0 = active, 1 = disabled
```

### Sync Rules Change Required
```yaml
# In farm_members bucket data query, add is_disabled:
- SELECT id, farm_id, user_id, role, full_name, is_disabled, created_at FROM farm_members WHERE farm_id = bucket.farm_id
```

## Open Questions

1. **Session handling for disabled users**
   - What we know: Disabling a user sets `is_disabled = 1` on `farm_members`. Their existing JWT/session remains valid.
   - What's unclear: Should we force-logout the disabled user immediately, or wait for next app load/token refresh?
   - Recommendation: Check `is_disabled` on app load (in AppLayout or RequireOnboarded). If disabled, show a message and sign out. This is simpler than modifying the `custom_access_token_hook` and gives immediate feedback next time the user opens the app.

2. **Disable vs. Remove distinction in UI**
   - What we know: The current UI has a trash icon for removing members (hard delete of `farm_members` row). Phase 7 adds disable (soft delete).
   - What's unclear: Should both options be available simultaneously, or should disable replace remove for most cases?
   - Recommendation: Keep both. Remove is for "this person should never have been added" or "they left the farm permanently." Disable is for "temporarily revoke access." The UI should make the distinction clear (e.g., a toggle/switch for disable, trash icon for remove).

3. **PowerSync sync rules for disabled users**
   - What we know: The current sync rules sync ALL `farm_members` for a farm. Admins need to see disabled members in the "show disabled" view.
   - What's unclear: Should disabled members still have OTHER farm data synced (wells, farms, invites)?
   - Recommendation: For Phase 7, do NOT modify sync rules for wells/farms. The `is_disabled` flag on `farm_members` will be synced. Client-side, the disabled user check happens on app load. Sync rule modification is a future hardening task.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of all 28 migrations, all TypeScript source files
- **`src/pages/UsersPage.tsx`** - Existing member list implementation
- **`src/pages/SettingsPage.tsx`** - Existing profile edit implementation
- **`src/lib/permissions.ts`** - Permission matrix and role system
- **`src/lib/powersync-schema.ts`** - PowerSync schema definitions
- **`docs/powersync-sync-rules.yaml`** - Sync rules documentation
- **`supabase/migrations/027_remove_farm_member.sql`** - RPC pattern reference

### Secondary (MEDIUM confidence)
- **Supabase official docs** - `auth.admin.updateUserById()` ban_duration API (verified via docs page + Context7)
- **Supabase GitHub Discussion #9239** - Community confirmation of `ban_duration` + `'none'` to unban
- **Blog post (eichgi.hashnode.dev)** - ban_duration format: `'none'` to unban, valid units: ns, us, ms, s, m, h

### Tertiary (LOW confidence)
- None. All findings verified against codebase or official sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and in use
- Architecture: HIGH - All patterns directly verified from existing codebase
- Database schema: HIGH - All migrations read and understood
- Disable mechanism: HIGH - Two approaches analyzed, clear recommendation based on existing patterns
- Pitfalls: HIGH - Derived from documented MEMORY.md lessons and codebase analysis

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable domain, no external dependency changes expected)
