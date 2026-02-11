-- =============================================================================
-- Migration 028: Fix public wrapper security type
-- =============================================================================
-- The SECURITY INVOKER wrappers in migrations 026 and 027 cannot access the
-- private schema (which has USAGE revoked from authenticated/anon/public).
-- This migration changes them to SECURITY DEFINER to match all other working
-- public wrappers (create_farm_and_membership, get_onboarding_status, etc.).
--
-- The private schema pattern remains valid: SECURITY DEFINER on the public
-- wrapper means it executes as the function owner (postgres), which has USAGE
-- on the private schema. The private impl functions still handle auth checks
-- via auth.uid() internally.
-- =============================================================================

-- Fix invite_user_by_phone wrapper
CREATE OR REPLACE FUNCTION public.invite_user_by_phone(
    p_farm_id UUID,
    p_phone TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT DEFAULT 'meter_checker'
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.invite_user_by_phone_impl(p_farm_id, p_phone, p_first_name, p_last_name, p_role);
$$;

COMMENT ON FUNCTION public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT, TEXT)
    IS 'Creates a phone-targeted invite for a farm with first/last name (grower/admin only)';

-- Fix remove_farm_member wrapper
CREATE OR REPLACE FUNCTION public.remove_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.remove_farm_member_impl(p_farm_id, p_member_user_id);
$$;

COMMENT ON FUNCTION public.remove_farm_member(UUID, UUID)
    IS 'Removes a farm member (super_admin/grower/admin, role hierarchy enforced, cannot remove self)';

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(uuid,text,text,text,text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.remove_farm_member(uuid, uuid) TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
