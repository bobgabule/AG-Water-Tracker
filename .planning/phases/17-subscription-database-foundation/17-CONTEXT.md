# Phase 17: Subscription Database Foundation - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Create subscription tier configuration tables and farm-to-tier linkage in Supabase so that tier limits are queryable and updatable without code deploys. This phase is database-only — no frontend changes, no PowerSync sync, no hooks.

</domain>

<decisions>
## Implementation Decisions

### Tier limits per role
- Two tiers: **Starter** (renamed from Basic) and **Pro**
- Starter: 1 admin, 1 meter checker, 5 wells
- Pro: 1 admin, 3 meter checkers, 10 wells
- Grower (account owner) is always exactly 1 per farm — NOT stored as a seat limit in the tiers table
- Super admin is exempt from all seat limits (they're the app owner, not a farm member)
- Super admin actions on a farm are still bound by that farm's tier limits (e.g., adding a meter checker to a Starter farm respects Starter limits)

### Tier schema
- Slug as primary key: 'starter', 'pro'
- Columns: slug (PK), display_name (text), max_admins (int), max_meter_checkers (int), max_wells (int)
- display_name stored in DB (e.g., "Starter Plan", "Pro Plan") so names can change without code deploy
- Tiers only control seat counts and well limits — no feature gating
- No is_active flag, no tier lifecycle management needed right now
- Schema should support adding more tiers later (just INSERT new rows)

### Farm-to-tier linkage
- farms.subscription_tier column referencing subscription_tiers slug
- No default tier — new farms must have an explicit tier assigned at creation
- Existing farms in DB get assigned 'pro' during migration
- Tier changes are direct column updates, no history tracking
- Self-service upgrade is the long-term vision (growers can upgrade their own tier)
- Tier change just updates the column directly — no audit log

### App settings
- app_settings table: key (text PK), value (text) — two columns only
- Initial rows: subscription_website_url, support_email, app_url
- All values seeded with placeholders (user will update before deploying)
- DB-only for now — not visible in the app, not synced to PowerSync yet
- Managed by super admin directly in Supabase dashboard
- All authenticated users can read (needed for future phases where app reads config)

### Claude's Discretion
- Sort order column on subscription_tiers (for display ordering)
- RLS policy details (read access patterns)
- Migration strategy for existing farms
- Exact placeholder values for app_settings seed data
- created_at/updated_at timestamps on tables

</decisions>

<specifics>
## Specific Ideas

- "Starter" not "Basic" — user explicitly chose the name
- Grower is the account owner, always 1, inherent to the farm — not a seat limit
- Super admin is the app-level owner who can manage multiple farms but doesn't count against any farm's limits
- Self-service upgrade is intended later — schema should not block this with overly restrictive RLS
- App URL setting is for SMS invite links — so invited users can click through to the app

</specifics>

<deferred>
## Deferred Ideas

- Self-service tier upgrade flow — future phase (beyond v3.0 scope)
- In-app settings management UI — not needed now
- Tier change audit logging — revisit if needed
- Feature gating by tier — not planned, tiers only control limits

</deferred>

---

*Phase: 17-subscription-database-foundation*
*Context gathered: 2026-02-22*
