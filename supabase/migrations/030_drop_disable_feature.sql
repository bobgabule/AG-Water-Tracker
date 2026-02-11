-- =============================================================================
-- Migration 030: Drop disable/enable feature
-- =============================================================================
-- Removes the is_disabled column from farm_members and drops all related
-- RPC functions. The only user management action is now remove_farm_member.
-- Disabled state data in the column is permanently deleted.
-- =============================================================================

-- =============================================================================
-- 1. Drop public wrapper functions first (they depend on private impls)
-- =============================================================================

DROP FUNCTION IF EXISTS public.disable_farm_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.enable_farm_member(UUID, UUID) CASCADE;

-- =============================================================================
-- 2. Drop private implementation functions
-- =============================================================================

DROP FUNCTION IF EXISTS private.disable_farm_member_impl(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS private.enable_farm_member_impl(UUID, UUID) CASCADE;

-- =============================================================================
-- 3. Drop the is_disabled column from farm_members
-- =============================================================================

ALTER TABLE public.farm_members DROP COLUMN IF EXISTS is_disabled CASCADE;

-- =============================================================================
-- 4. Reload PostgREST schema cache
-- =============================================================================

NOTIFY pgrst, 'reload schema';
