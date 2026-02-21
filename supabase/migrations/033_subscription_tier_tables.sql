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
COMMENT ON COLUMN subscription_tiers.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN subscription_tiers.updated_at IS 'Last modification timestamp (auto-updated via trigger)';

-- updated_at trigger (reuses function from migration 001)
CREATE TRIGGER update_subscription_tiers_updated_at
    BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
COMMENT ON COLUMN app_settings.created_at IS 'Row creation timestamp';
COMMENT ON COLUMN app_settings.updated_at IS 'Last modification timestamp (auto-updated via trigger)';

-- updated_at trigger
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
