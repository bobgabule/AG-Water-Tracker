-- =============================================================================
-- Migration 027: Remove farm member RPC
-- =============================================================================
-- Allows growers and admins to remove members from their farm.
-- Enforces role hierarchy: grower/super_admin can remove admin or meter_checker,
-- admin can only remove meter_checker. Nobody can remove the grower or themselves.
-- =============================================================================

-- =============================================================================
-- 1. Private implementation (SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION private.remove_farm_member_impl(
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

    -- Cannot remove yourself
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot remove yourself from the farm';
    END IF;

    -- Get caller's role in this farm
    SELECT role INTO v_caller_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    -- Only super_admin, grower, admin can remove members
    IF v_caller_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'You do not have permission to remove farm members';
    END IF;

    -- Get target's role in this farm
    SELECT role INTO v_target_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this farm';
    END IF;

    -- super_admin can remove any other user
    IF v_caller_role = 'super_admin' THEN
        -- allowed, skip further checks
        NULL;
    -- grower can remove admin and meter_checker, but not super_admin
    ELSIF v_caller_role = 'grower' THEN
        IF v_target_role = 'super_admin' THEN
            RAISE EXCEPTION 'Cannot remove a super admin';
        END IF;
        IF v_target_role = 'grower' THEN
            RAISE EXCEPTION 'Cannot remove the farm owner';
        END IF;
    -- admin can only remove meter_checker
    ELSIF v_caller_role = 'admin' THEN
        IF v_target_role <> 'meter_checker' THEN
            RAISE EXCEPTION 'Admins can only remove meter checkers';
        END IF;
    END IF;

    -- Delete the membership
    DELETE FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- =============================================================================
-- 2. Public SECURITY INVOKER wrapper
-- =============================================================================

CREATE OR REPLACE FUNCTION public.remove_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.remove_farm_member_impl(p_farm_id, p_member_user_id);
$$;

COMMENT ON FUNCTION public.remove_farm_member(UUID, UUID)
    IS 'Removes a farm member (super_admin/grower/admin, role hierarchy enforced, cannot remove self)';

-- =============================================================================
-- 3. Grant permissions and reload schema
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.remove_farm_member(uuid, uuid)
    TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
