# Phase 17: Subscription Database Foundation - Research

**Researched:** 2026-02-22
**Domain:** PostgreSQL schema design (Supabase), configuration tables, foreign key linkage
**Confidence:** HIGH

## Summary

Phase 17 creates three database objects: a `subscription_tiers` lookup table, an `app_settings` key-value config table, and a `subscription_tier` column on the existing `farms` table. All three are standard PostgreSQL patterns with no library dependencies, no frontend changes, and no PowerSync sync. The phase is entirely a Supabase migration file (033).

The project has 32 prior migrations with well-established conventions: banner-comment headers, `COMMENT ON` annotations, RLS with helper-function-based policies, `updated_at` triggers reusing the `update_updated_at_column()` function from migration 001, and `NOTIFY pgrst, 'reload schema'` at the end. This migration follows those conventions exactly.

The main design decisions are locked by the user: slug-based text primary keys (`'starter'`, `'pro'`), explicit tier assignment (no default), existing farms get `'pro'`, and `app_settings` uses a two-column `key`/`value` structure. Claude has discretion on sort order, RLS details, timestamps, placeholder values, and migration strategy for existing farms.

**Primary recommendation:** Write a single migration file `033_subscription_tier_tables.sql` that creates both tables, adds the FK column to farms, seeds data, enables RLS with read policies for all authenticated users, and backfills existing farms to `'pro'`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two tiers: **Starter** (renamed from Basic) and **Pro**
- Starter: 1 admin, 1 meter checker, 5 wells
- Pro: 1 admin, 3 meter checkers, 10 wells
- Grower (account owner) is always exactly 1 per farm -- NOT stored as a seat limit in the tiers table
- Super admin is exempt from all seat limits (they're the app owner, not a farm member)
- Super admin actions on a farm are still bound by that farm's tier limits (e.g., adding a meter checker to a Starter farm respects Starter limits)
- Slug as primary key: 'starter', 'pro'
- Columns: slug (PK), display_name (text), max_admins (int), max_meter_checkers (int), max_wells (int)
- display_name stored in DB (e.g., "Starter Plan", "Pro Plan") so names can change without code deploy
- Tiers only control seat counts and well limits -- no feature gating
- No is_active flag, no tier lifecycle management needed right now
- Schema should support adding more tiers later (just INSERT new rows)
- farms.subscription_tier column referencing subscription_tiers slug
- No default tier -- new farms must have an explicit tier assigned at creation
- Existing farms in DB get assigned 'pro' during migration
- Tier changes are direct column updates, no history tracking
- Self-service upgrade is the long-term vision (growers can upgrade their own tier)
- Tier change just updates the column directly -- no audit log
- app_settings table: key (text PK), value (text) -- two columns only
- Initial rows: subscription_website_url, support_email, app_url
- All values seeded with placeholders (user will update before deploying)
- DB-only for now -- not visible in the app, not synced to PowerSync yet
- Managed by super admin directly in Supabase dashboard
- All authenticated users can read (needed for future phases where app reads config)

### Claude's Discretion
- Sort order column on subscription_tiers (for display ordering)
- RLS policy details (read access patterns)
- Migration strategy for existing farms
- Exact placeholder values for app_settings seed data
- created_at/updated_at timestamps on tables

### Deferred Ideas (OUT OF SCOPE)
- Self-service tier upgrade flow -- future phase (beyond v3.0 scope)
- In-app settings management UI -- not needed now
- Tier change audit logging -- revisit if needed
- Feature gating by tier -- not planned, tiers only control limits
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIER-01 | `subscription_tiers` table in Supabase with per-role seat limits and well limits per tier | CREATE TABLE with slug PK, display_name, max_admins, max_meter_checkers, max_wells; seed Starter and Pro rows; RLS read policy for authenticated users |
| TIER-02 | `app_settings` table in Supabase for global key-value config (subscription website URL, support email) | CREATE TABLE with key text PK and value text; seed three initial rows; RLS read policy for authenticated users |
| TIER-03 | `farms.subscription_tier` column linking each farm to a tier | ALTER TABLE farms ADD COLUMN subscription_tier TEXT NOT NULL REFERENCES subscription_tiers(slug); backfill existing farms to 'pro' before adding NOT NULL constraint |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15 (Supabase-hosted) | All schema, RLS, and data | Already the project's database |
| Supabase Migrations | N/A | Schema versioning | Project uses numbered SQL files in `supabase/migrations/` |

### Supporting
No additional libraries needed. This phase is pure SQL.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Text slug PK | UUID PK + slug column | UUID adds indirection; slug PK is simpler for a small lookup table and allows `farms.subscription_tier = 'starter'` to be human-readable in queries |
| Seed data in migration | Separate seed file | Migration ensures data exists in all environments; seed files require separate execution and can drift |
| Single migration file | Multiple migration files | One file is atomic; splitting adds risk of partial application with FK references to not-yet-created tables |

**Installation:**
No packages to install. Pure SQL migration.

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  migrations/
    033_subscription_tier_tables.sql    # This phase's single migration
```

No changes to `src/` in this phase. The existing `src/lib/subscription.ts` with hardcoded `PLAN_LIMITS` remains untouched until Phase 18.

### Pattern 1: Text Primary Key for Lookup Tables
**What:** Use the tier slug (`'starter'`, `'pro'`) as the primary key instead of a UUID or serial ID.
**When to use:** Small, stable lookup tables where the key is meaningful and human-readable.
**Why:** Foreign key values in `farms.subscription_tier` are self-documenting. Querying `WHERE subscription_tier = 'starter'` is clearer than joining on a UUID. The project already uses this pattern for `farm_invites.code` as PK.

```sql
CREATE TABLE subscription_tiers (
    slug TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    max_admins INTEGER NOT NULL,
    max_meter_checkers INTEGER NOT NULL,
    max_wells INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Pattern 2: Backfill-Then-Constrain for Adding NOT NULL FK Column
**What:** Add the column as nullable first, backfill existing rows, then add the NOT NULL constraint.
**When to use:** Adding a NOT NULL column with a foreign key to a table that already has rows.
**Why:** A direct `ADD COLUMN ... NOT NULL REFERENCES ...` fails if existing rows have no value for the new column. The three-step approach is the standard PostgreSQL pattern.

```sql
-- Step 1: Add nullable column with FK
ALTER TABLE farms ADD COLUMN subscription_tier TEXT REFERENCES subscription_tiers(slug);

-- Step 2: Backfill existing rows
UPDATE farms SET subscription_tier = 'pro' WHERE subscription_tier IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE farms ALTER COLUMN subscription_tier SET NOT NULL;
```

### Pattern 3: RLS Read-Only for Authenticated Users
**What:** Enable RLS and grant SELECT to all authenticated users. No INSERT/UPDATE/DELETE policies.
**When to use:** Configuration/lookup tables managed by super admins via Supabase dashboard (which uses the `service_role` key and bypasses RLS).
**Why:** All app users need to read tier limits and app settings. Write access is only needed by super admins, who use the Supabase dashboard (service_role bypasses RLS). Not creating write policies prevents any API-level writes by regular users.

```sql
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subscription tiers"
    ON subscription_tiers FOR SELECT
    TO authenticated
    USING (true);
```

### Pattern 4: Key-Value Config Table
**What:** A simple two-column table with a text primary key (the setting name) and a text value.
**When to use:** Global application settings that need to be changeable without code deploys.
**Why:** Keeps the schema simple. All values are text; the consuming code casts as needed. Adding new settings is just an INSERT.

```sql
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Anti-Patterns to Avoid
- **Adding a DEFAULT on farms.subscription_tier:** The user explicitly decided no default. New farms must have a tier assigned at creation. Adding a default would hide bugs where farm creation code forgets to set the tier.
- **Using ENUM type for tier slugs:** ENUMs require `ALTER TYPE` to add new values, which is more complex than just INSERTing a new row. Text with FK is more flexible.
- **Putting tier limits in app_settings:** Tier-specific limits belong in `subscription_tiers`, not as flat key-value pairs. The structured table is queryable and type-safe.
- **Creating write RLS policies for config tables:** Super admin manages these through the Supabase dashboard (service_role), which bypasses RLS. Creating write policies would allow any authenticated user to modify config.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema versioning | Custom migration scripts | Supabase numbered migrations (`supabase/migrations/NNN_*.sql`) | Project convention; applied via `supabase db push` or dashboard |
| Auto-updating timestamps | Custom trigger per table | Reuse existing `update_updated_at_column()` from migration 001 | Already exists and is used on every table in the project |
| PostgREST schema cache | Manual schema reload | `NOTIFY pgrst, 'reload schema'` at end of migration | Standard Supabase pattern; ensures PostgREST picks up new tables/columns immediately |

**Key insight:** This phase is straightforward SQL. There is nothing to hand-roll -- the entire implementation is a single migration file using standard PostgreSQL DDL, DML, and RLS patterns already established in this project.

## Common Pitfalls

### Pitfall 1: NOT NULL Column on Existing Table Without Backfill
**What goes wrong:** `ALTER TABLE farms ADD COLUMN subscription_tier TEXT NOT NULL REFERENCES subscription_tiers(slug)` fails because existing farms rows have NULL for the new column.
**Why it happens:** PostgreSQL validates NOT NULL against all existing rows during ALTER TABLE.
**How to avoid:** Three-step pattern: add nullable, backfill, set NOT NULL. This is the standard approach used in this project (see migration 031 pattern).
**Warning signs:** Migration fails with `column "subscription_tier" of relation "farms" contains null values`.

### Pitfall 2: Foreign Key Before Referenced Table Exists
**What goes wrong:** Adding `subscription_tier REFERENCES subscription_tiers(slug)` before `subscription_tiers` table is created.
**Why it happens:** SQL statements execute sequentially. FK references must point to existing tables.
**How to avoid:** Create `subscription_tiers` first, seed its data, then ALTER farms.
**Warning signs:** Migration fails with `relation "subscription_tiers" does not exist`.

### Pitfall 3: Forgetting NOTIFY pgrst After Schema Changes
**What goes wrong:** New tables and columns exist in PostgreSQL but are invisible via PostgREST API until the next cache refresh (up to 60 seconds).
**Why it happens:** PostgREST caches the database schema. It only refreshes on NOTIFY or periodic reload.
**How to avoid:** Add `NOTIFY pgrst, 'reload schema';` at the end of every migration that changes tables/columns. This project does this in migration 024.
**Warning signs:** Supabase client queries return 404 or "relation not found" for newly created tables despite migration success.

### Pitfall 4: Missing RLS Enables on New Tables
**What goes wrong:** New tables are accessible to any authenticated user without restriction.
**Why it happens:** PostgreSQL tables have RLS disabled by default. Forgetting `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` exposes all rows.
**How to avoid:** Every CREATE TABLE must be followed by ENABLE RLS and at least one SELECT policy. In this case, the policy grants read to all authenticated users, but RLS must still be enabled to enforce that no write access is granted via API.
**Warning signs:** Any authenticated user can INSERT/UPDATE/DELETE config rows via Supabase client.

### Pitfall 5: Forgetting to Add updated_at Trigger
**What goes wrong:** The `updated_at` column never changes when rows are updated, breaking any future logic that depends on modification timestamps.
**Why it happens:** `DEFAULT NOW()` only sets the value on INSERT. Updates need an explicit trigger.
**How to avoid:** Attach `update_updated_at_column()` trigger to every new table. This project's convention since migration 001.
**Warning signs:** `updated_at` always equals `created_at` after row updates.

### Pitfall 6: Requirements Naming Discrepancy
**What goes wrong:** REQUIREMENTS.md says "Basic" tier and "default: basic". CONTEXT.md says "Starter" tier and "no default". The migration must follow CONTEXT.md (user decisions), not REQUIREMENTS.md original text.
**Why it happens:** Requirements were written before the user discussion phase. CONTEXT.md captures the refined decisions.
**How to avoid:** Always follow CONTEXT.md decisions over REQUIREMENTS.md original wording. The requirements IDs (TIER-01, TIER-02, TIER-03) still apply, but the specific values come from CONTEXT.md.
**Warning signs:** Using 'basic' instead of 'starter', or adding a DEFAULT on farms.subscription_tier.

## Code Examples

### Complete Migration Structure
```sql
-- =============================================================================
-- Migration 033: Subscription tier tables and farm linkage
-- =============================================================================
-- Creates:
--   1. subscription_tiers - Lookup table for tier limits (Starter, Pro)
--   2. app_settings - Key-value global config table
--   3. farms.subscription_tier - FK column linking farms to tiers
--
-- Phase 17: Subscription Database Foundation
-- Requirements: TIER-01, TIER-02, TIER-03
-- =============================================================================

-- =============================================================================
-- 1. subscription_tiers table
-- =============================================================================

CREATE TABLE subscription_tiers (
    slug TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    max_admins INTEGER NOT NULL,
    max_meter_checkers INTEGER NOT NULL,
    max_wells INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE subscription_tiers IS 'Tier definitions with per-role seat limits and well limits';
COMMENT ON COLUMN subscription_tiers.slug IS 'URL-safe identifier used as PK and FK reference';
COMMENT ON COLUMN subscription_tiers.display_name IS 'Human-readable tier name (changeable without code deploy)';
COMMENT ON COLUMN subscription_tiers.max_admins IS 'Maximum admin seats for this tier';
COMMENT ON COLUMN subscription_tiers.max_meter_checkers IS 'Maximum meter checker seats for this tier';
COMMENT ON COLUMN subscription_tiers.max_wells IS 'Maximum wells allowed for this tier';
COMMENT ON COLUMN subscription_tiers.sort_order IS 'Display ordering (lower = first)';

-- updated_at trigger (reuses function from migration 001)
CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed tier data
INSERT INTO subscription_tiers (slug, display_name, max_admins, max_meter_checkers, max_wells, sort_order)
VALUES
    ('starter', 'Starter Plan', 1, 1, 5, 1),
    ('pro', 'Pro Plan', 1, 3, 10, 2);

-- =============================================================================
-- 2. app_settings table
-- =============================================================================

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'Global application configuration (key-value pairs)';
COMMENT ON COLUMN app_settings.key IS 'Setting identifier (e.g., subscription_website_url)';
COMMENT ON COLUMN app_settings.value IS 'Setting value (text; consuming code casts as needed)';

-- updated_at trigger
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial settings with placeholder values
INSERT INTO app_settings (key, value) VALUES
    ('subscription_website_url', 'https://example.com/subscribe'),
    ('support_email', 'support@example.com'),
    ('app_url', 'https://example.com/app');

-- =============================================================================
-- 3. farms.subscription_tier column (three-step: add, backfill, constrain)
-- =============================================================================

-- Step 1: Add nullable column with FK reference
ALTER TABLE farms ADD COLUMN subscription_tier TEXT REFERENCES subscription_tiers(slug);

-- Step 2: Backfill existing farms to 'pro'
UPDATE farms SET subscription_tier = 'pro' WHERE subscription_tier IS NULL;

-- Step 3: Set NOT NULL constraint
ALTER TABLE farms ALTER COLUMN subscription_tier SET NOT NULL;

COMMENT ON COLUMN farms.subscription_tier IS 'References subscription_tiers.slug -- determines seat and well limits';

-- Index for potential queries filtering farms by tier
CREATE INDEX idx_farms_subscription_tier ON farms(subscription_tier);

-- =============================================================================
-- 4. Row Level Security
-- =============================================================================

ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tier definitions
CREATE POLICY "Authenticated users can read subscription tiers"
    ON subscription_tiers FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can read app settings
CREATE POLICY "Authenticated users can read app settings"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

-- No INSERT/UPDATE/DELETE policies: managed by super admin via Supabase dashboard (service_role)

-- =============================================================================
-- 5. Notify PostgREST of schema changes
-- =============================================================================

NOTIFY pgrst, 'reload schema';
```

### Querying Tier Limits for a Farm
```sql
-- Get a farm's tier limits (what Phase 18 hooks will use)
SELECT
    f.id AS farm_id,
    f.name AS farm_name,
    st.display_name AS tier_name,
    st.max_admins,
    st.max_meter_checkers,
    st.max_wells
FROM farms f
JOIN subscription_tiers st ON st.slug = f.subscription_tier
WHERE f.id = 'some-farm-uuid';
```

### Changing a Tier (Direct DB Update)
```sql
-- Upgrade a farm from Starter to Pro (done in Supabase dashboard SQL editor)
UPDATE farms SET subscription_tier = 'pro' WHERE id = 'some-farm-uuid';
```

### Adding a New Tier in the Future
```sql
-- No code deploy needed -- just INSERT a new row
INSERT INTO subscription_tiers (slug, display_name, max_admins, max_meter_checkers, max_wells, sort_order)
VALUES ('enterprise', 'Enterprise Plan', 3, 10, 50, 3);
```

### Reading App Settings
```sql
-- Get a specific setting
SELECT value FROM app_settings WHERE key = 'subscription_website_url';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `PLAN_LIMITS` in `src/lib/subscription.ts` | DB-driven `subscription_tiers` table | Phase 17 (this migration) | Tier limits become updatable without code deploy |
| No app config table | `app_settings` key-value table | Phase 17 (this migration) | Global settings like URLs and emails stored in DB |
| No tier column on farms | `farms.subscription_tier` FK column | Phase 17 (this migration) | Each farm explicitly linked to a tier |

**Deprecated/outdated:**
- `src/lib/subscription.ts` `PLAN_LIMITS` constant: Still used in Phase 17, but will be replaced by `useSubscriptionTier()` hook in Phase 18. Not modified in this phase.

## Open Questions

1. **create_farm_and_membership RPC needs subscription_tier parameter**
   - What we know: The `private.create_farm_and_membership_impl` function INSERTs into `farms` but does not set `subscription_tier`. After this migration, the column is NOT NULL with no default.
   - What's unclear: Whether to update the RPC in this phase or defer to a later phase.
   - Recommendation: Do NOT update the RPC in this phase. The user said "DB-only -- no frontend, no PowerSync sync." The RPC is called from the frontend onboarding flow which will be removed in Phase 21. If farm creation is needed before Phase 21, the super admin can create farms via the Supabase dashboard (service_role bypasses RLS and can set the column directly). The planner should note this as a known gap and track it.

2. **Should sort_order be included on subscription_tiers?**
   - What we know: CONTEXT.md lists this as Claude's discretion. sort_order enables consistent display ordering in future UI.
   - Recommendation: **Include it.** It costs nothing (one INTEGER column), prevents a future ALTER TABLE, and the seed data can set Starter=1, Pro=2. Future tiers can slot in with sort_order=3, 4, etc.

3. **Should created_at/updated_at be included on new tables?**
   - What we know: CONTEXT.md lists this as Claude's discretion. Every other table in the project has these columns.
   - Recommendation: **Include them.** Project convention is to have timestamps on all tables. The `update_updated_at_column()` trigger function already exists.

## Sources

### Primary (HIGH confidence)
- Project codebase: `supabase/migrations/001_initial_schema.sql` through `032_well_edit_allocation_schema.sql` -- established migration conventions
- Project codebase: `src/lib/subscription.ts` -- current hardcoded plan limits
- Project codebase: `supabase/migrations/021_four_role_system.sql` -- role system and seat limit model
- Project codebase: `supabase/migrations/024_fix_search_path_and_legacy_cleanup.sql` -- NOTIFY pgrst pattern, GRANT EXECUTE pattern
- Project codebase: `supabase/migrations/031_create_readings_and_allocations.sql` -- recent CREATE TABLE + RLS + trigger conventions
- `/llmstxt/supabase_llms_txt` (Context7) -- RLS policy syntax, ALTER TABLE ADD COLUMN, foreign key patterns

### Secondary (MEDIUM confidence)
- PostgreSQL documentation -- three-step pattern for NOT NULL FK columns on existing tables (standard PostgreSQL knowledge, verified against project's own migration patterns)

### Tertiary (LOW confidence)
- None. All findings are from the project codebase or verified Supabase documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- pure SQL, no new libraries, follows established project conventions
- Architecture: HIGH -- single migration file, patterns derived directly from prior migrations in this project
- Pitfalls: HIGH -- all pitfalls identified from actual project history (search_path issues, NOTIFY, RLS) or standard PostgreSQL behavior

**Research date:** 2026-02-22
**Valid until:** Indefinite -- PostgreSQL DDL patterns are stable
