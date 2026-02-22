# Phase 22: Farm Data Isolation Audit - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit and enforce farm data isolation across all database layers: RLS policies, PowerSync sync rules, RPC functions, trigger functions, and the PowerSync connector. Verify super_admin cross-farm access works consistently. Fix all gaps found. Produce a detailed audit report.

</domain>

<decisions>
## Implementation Decisions

### Super Admin Access Model
- Super admin identified by hardcoded user ID stored in `app_settings` table (not a role column)
- Only one super_admin account (the client's) — account doesn't exist yet, design for configurable ID
- Farm-by-farm selection via FarmSelector in the header — no merged all-farms view
- Super admin sees ALL farms in FarmSelector (regardless of membership), farm name only
- Full admin powers on any farm — can edit wells, manage users, add/remove members
- Same navigation and pages as a regular farm admin — just with farm switching
- Last-viewed farm remembered on login (persist selection across sessions)
- Always-maroon header background when logged in as super_admin
- No extra confirmation prompts for write actions — maroon header is sufficient awareness
- No farm creation from the app — farms created externally via Supabase/backend

### Audit Scope & Tables
- **Core tables (from success criteria):** wells, readings, allocations, farm_members
- **Additional tables to audit:** farm_invites, farms, subscription_tiers, app_settings, users
- **subscription_tiers:** Only growers and admins can see their farm's tier. Only growers can upgrade/downgrade
- **app_settings:** Backend-only storage, no UI visibility needed. Accessible via DB queries only
- **users table:** Role-based visibility — admins/growers see all farm members, technicians see only themselves
- **One farm per user** — regular users belong to exactly one farm (simplifies isolation)
- **PowerSync vs RLS alignment:** Claude's discretion on which takes priority when mismatched
- **Audit all RPCs** — review every Supabase RPC function for farm isolation
- **Audit trigger functions** — review all DB triggers for farm boundary respect
- **Historical data cleanup** — check for existing rows violating isolation, fix them
- **Storage/realtime/edge functions:** Claude checks codebase and audits if any exist
- **Client-side queries:** Claude determines if hooks need explicit farm_id filters beyond sync rules
- **Connector upload path:** Claude determines defense-in-depth strategy

### Gap Remediation Approach
- Fix all gaps immediately in-phase — no gaps left open
- Claude balances security vs functionality when fixes could break existing queries
- Bundle related fixes into grouped migration files (by table/category)
- Prioritize by severity: cross-farm data leakage first, then visibility rules, then cosmetic
- Every fix migration has a corresponding rollback migration
- Test fixes locally with Supabase local dev before creating final migration
- Produce a detailed written audit report (markdown) documenting everything checked, found, and fixed

### Verification Evidence
- Claude determines verification approach (scripts, checklist, or both)
- Claude determines adversarial vs positive testing strategy
- Claude determines report location (.planning/ vs docs/)
- Update PowerSync sync rules documentation (docs/powersync-sync-rules.yaml) to reflect any changes

### Claude's Discretion
- PowerSync vs RLS priority when mismatched
- Whether client-side queries need explicit farm_id filters
- Connector upload path defense-in-depth strategy
- Storage/realtime/edge function audit scope
- Verification evidence format and location
- Breaking change handling (security vs functionality balance)
- Custom endpoint audit scope

</decisions>

<specifics>
## Specific Ideas

- Super admin header is always maroon (not the default app header color)
- FarmSelector in header shows farm names only (no metadata)
- Super admin ID stored in `app_settings` table — configurable without code deploy
- Client account doesn't exist yet — system should work when the ID is set later

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-farm-data-isolation-audit*
*Context gathered: 2026-02-22*
