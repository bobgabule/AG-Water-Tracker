-- =============================================================================
-- Migration 029: Disable/Enable farm member RPCs
-- =============================================================================
-- Adds is_disabled column to farm_members and provides disable/enable RPCs.
-- Enforces role hierarchy: super_admin can disable anyone (except self),
-- grower can disable admin and meter_checker, admin can only disable
-- meter_checker. Nobody can disable themselves.
-- Uses INTEGER (not BOOLEAN) because PowerSync doesn't support BOOLEAN.
-- =============================================================================

-- =============================================================================
-- 1. Add is_disabled column
-- =============================================================================

ALTER TABLE public.farm_members
    ADD COLUMN IF NOT EXISTS is_disabled INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- 2. Private implementation: disable_farm_member_impl
-- =============================================================================

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
    v_target_disabled INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cannot disable yourself
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot disable yourself';
    END IF;

    -- Get caller's role in this farm
    SELECT role INTO v_caller_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    -- Only super_admin, grower, admin can disable members
    IF v_caller_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'You do not have permission to disable farm members';
    END IF;

    -- Get target's role and disabled status in this farm
    SELECT role, is_disabled INTO v_target_role, v_target_disabled
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this farm';
    END IF;

    -- Cannot disable already-disabled user
    IF v_target_disabled = 1 THEN
        RAISE EXCEPTION 'User is already disabled';
    END IF;

    -- Enforce role hierarchy
    -- super_admin can disable anyone except themselves (already checked above)
    IF v_caller_role = 'super_admin' THEN
        NULL; -- allowed
    -- grower can disable admin and meter_checker, but not super_admin or grower
    ELSIF v_caller_role = 'grower' THEN
        IF v_target_role = 'super_admin' THEN
            RAISE EXCEPTION 'Cannot disable a super admin';
        END IF;
        IF v_target_role = 'grower' THEN
            RAISE EXCEPTION 'Cannot disable the farm owner';
        END IF;
    -- admin can only disable meter_checker
    ELSIF v_caller_role = 'admin' THEN
        IF v_target_role <> 'meter_checker' THEN
            RAISE EXCEPTION 'Admins can only disable meter checkers';
        END IF;
    END IF;

    -- Disable the member
    UPDATE public.farm_members
    SET is_disabled = 1
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- =============================================================================
-- 3. Public wrapper: disable_farm_member
-- =============================================================================

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

COMMENT ON FUNCTION public.disable_farm_member(UUID, UUID)
    IS 'Disables a farm member (super_admin/grower/admin, role hierarchy enforced, cannot disable self)';

-- =============================================================================
-- 4. Private implementation: enable_farm_member_impl
-- =============================================================================

CREATE OR REPLACE FUNCTION private.enable_farm_member_impl(
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
    v_target_disabled INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cannot enable yourself (shouldn't be possible since you'd be disabled, but guard anyway)
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot enable yourself';
    END IF;

    -- Get caller's role in this farm
    SELECT role INTO v_caller_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    -- Only super_admin, grower, admin can enable members
    IF v_caller_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'You do not have permission to enable farm members';
    END IF;

    -- Get target's role and disabled status in this farm
    SELECT role, is_disabled INTO v_target_role, v_target_disabled
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this farm';
    END IF;

    -- Cannot enable already-active user
    IF v_target_disabled = 0 THEN
        RAISE EXCEPTION 'User is not disabled';
    END IF;

    -- Enforce role hierarchy (same as disable)
    IF v_caller_role = 'super_admin' THEN
        NULL; -- allowed
    ELSIF v_caller_role = 'grower' THEN
        IF v_target_role = 'super_admin' THEN
            RAISE EXCEPTION 'Cannot enable a super admin';
        END IF;
        IF v_target_role = 'grower' THEN
            RAISE EXCEPTION 'Cannot enable the farm owner';
        END IF;
    ELSIF v_caller_role = 'admin' THEN
        IF v_target_role <> 'meter_checker' THEN
            RAISE EXCEPTION 'Admins can only enable meter checkers';
        END IF;
    END IF;

    -- Enable the member
    UPDATE public.farm_members
    SET is_disabled = 0
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- =============================================================================
-- 5. Public wrapper: enable_farm_member
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enable_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.enable_farm_member_impl(p_farm_id, p_member_user_id);
$$;

COMMENT ON FUNCTION public.enable_farm_member(UUID, UUID)
    IS 'Re-enables a disabled farm member (super_admin/grower/admin, role hierarchy enforced)';

-- =============================================================================
-- 6. Grant permissions and reload schema
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.disable_farm_member(uuid, uuid)
    TO authenticated, anon, public;

GRANT EXECUTE ON FUNCTION public.enable_farm_member(uuid, uuid)
    TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
