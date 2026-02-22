# Phase 19: Permission Enforcement - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Gate well editing, well creation, allocation management, and navigation so that meter checkers can only view well data and record/edit/delete readings. Extend the permission matrix with fine-grained actions replacing the coarse `manage_wells`. Audit and update all existing permission checks.

</domain>

<decisions>
## Implementation Decisions

### Denied Access Behavior
- Guarded routes redirect silently to well detail page (`/wells/:id`)
- No toast or notification on redirect — the missing buttons signal no access
- Same redirect pattern for all guarded routes (edit well, allocations, create well)
- Must work offline — guard checks role from local PowerSync DB
- super_admin goes through the permission matrix (not a special bypass)
- No role demotion exists — roles are set at invite time, permissions read from live synced role

### Button & Navigation Visibility
- All gated buttons are **completely hidden** (not disabled) for meter checkers
- Hidden buttons: Edit Well, Delete Well (future), New Well, allocation CRUD, View Allocations link
- Add Well FAB on map: hidden for meter checkers
- New Well button on wells list page: hidden for meter checkers
- Record Reading button: **visible to all roles** (core meter checker action)
- Well list items: identical appearance for all roles (no edit chevron differences)
- Bottom nav for meter checkers: **Map, Wells, Settings, Language** (Users tab hidden)
- Users page: hidden entirely for meter checkers (nav item + route)
- Settings page: reduced set for meter checkers — hide all farm-level management settings (subscription, farm name, etc.), show only personal settings
- Admins see everything growers see — identical visibility

### Allocation Page Access
- Meter checkers see allocation data (usage gauge, allocation period) on well detail page in **read-only** mode
- View Allocations link on well detail page: **hidden** for meter checkers
- Route guard on `/wells/:id/allocations`: redirects meter checkers to well detail (silent)
- Well list page: allocation columns (usage %, status) **visible** to meter checkers
- Admins have full allocation CRUD (create, edit, delete) — same as growers
- Admins can delete wells — same as growers

### Permission Matrix Shape
**Approach:** Hybrid — grouped `manage_*` where all roles share same access, granular well/reading actions where roles differ.

**Actions (12 total):**
`create_well`, `edit_well`, `delete_well`, `manage_allocations`, `record_reading`, `edit_reading`, `delete_reading`, `view_wells`, `manage_users`, `manage_farm`, `manage_invites`, `cross_farm_access`

**Removed:** `manage_wells` (replaced by granular `create/edit/delete_well`), `view_members` (no longer needed — Users page hidden for meter checkers)

**Matrix:**
| Action | super_admin | grower | admin | meter_checker |
|--------|:-----------:|:------:|:-----:|:-------------:|
| create_well | x | x | x | |
| edit_well | x | x | x | |
| delete_well | x | x | x | |
| manage_allocations | x | x | x | |
| record_reading | x | x | x | x |
| edit_reading | x | x | x | x |
| delete_reading | x | x | x | x |
| view_wells | x | x | x | x |
| manage_users | x | x | x | |
| manage_farm | x | x | | |
| manage_invites | x | x | x | |
| cross_farm_access | x | | | |

**Audit:** All existing `manage_wells` and `view_members` references must be found and updated to appropriate granular actions.

### Claude's Discretion
- Whether to use a reusable `<PermissionGuard>` component or per-page inline checks (based on existing patterns)
- Whether to add convenience helpers like `canManageWells(role)` (based on how many places need grouped checks)
- Whether to keep or remove `isAdminOrAbove()` (evaluate usage, replace with action checks where appropriate)
- Loading/skeleton states during permission resolution

</decisions>

<specifics>
## Specific Ideas

- Meter checker experience should be clean — they see Map + Wells + Settings + Language, tap a well, see detail + usage gauge + readings, and record readings. That's their whole world.
- "No demotion" — roles are assigned at invite, managed by add/edit/delete of users, and changes propagate via real-time sync.

</specifics>

<deferred>
## Deferred Ideas

- Well deletion UI — permission action `delete_well` added to matrix now, but the UI for deleting wells isn't built yet (future phase)

</deferred>

---

*Phase: 19-permission-enforcement*
*Context gathered: 2026-02-22*
