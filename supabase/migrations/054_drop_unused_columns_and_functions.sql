-- =============================================================================
-- Migration 054: Drop unused columns and dead functions
-- =============================================================================
-- Cleanup after cross-referencing all migrations against app code, edge
-- functions, PowerSync sync rules, and client schema.
--
-- Dropped columns:
--   farms.description         — Created in 001, never referenced anywhere
--   allocations.is_manual_override — Created in 031, never read/written by app
--   subscription_tiers.sort_order — Seeded but never queried
--
-- NOT dropped (used by stored functions):
--   farm_invites.max_uses     — Referenced by get_onboarding_status_impl (051)
--                                and invite_user_by_phone_impl (048)
--
-- Dropped functions:
--   private.generate_random_code_impl — Replaced by gen_random_uuid() in 048
-- =============================================================================

-- Drop unused columns
ALTER TABLE public.farms DROP COLUMN IF EXISTS description;
ALTER TABLE public.allocations DROP COLUMN IF EXISTS is_manual_override;
ALTER TABLE public.subscription_tiers DROP COLUMN IF EXISTS sort_order;

-- Drop dead function (last caller was migration 044; 048 switched to gen_random_uuid)
DROP FUNCTION IF EXISTS private.generate_random_code_impl(INTEGER);
