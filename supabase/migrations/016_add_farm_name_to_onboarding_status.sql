-- =============================================================================
-- Migration 016: Add farm_name to get_onboarding_status RPC
-- =============================================================================
-- Updates the get_onboarding_status function to include the farm name in its
-- response. This eliminates the need to wait for PowerSync to sync the farms
-- table before displaying the farm name in the UI.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_onboarding_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_profile BOOLEAN;
    v_has_farm_membership BOOLEAN;
    v_farm_id UUID;
    v_farm_name TEXT;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();

    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if user has a profile in the users table
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = v_user_id
    ) INTO v_has_profile;

    -- Check if user has any farm memberships and get the first farm_id and farm_name
    SELECT fm.farm_id, f.name
    INTO v_farm_id, v_farm_name
    FROM farm_members fm
    JOIN farms f ON f.id = fm.farm_id
    WHERE fm.user_id = v_user_id
    ORDER BY fm.created_at ASC
    LIMIT 1;

    v_has_farm_membership := v_farm_id IS NOT NULL;

    -- Return the status as JSON (now includes farm_name)
    RETURN json_build_object(
        'has_profile', v_has_profile,
        'has_farm_membership', v_has_farm_membership,
        'farm_id', v_farm_id,
        'farm_name', v_farm_name
    );
END;
$$;

COMMENT ON FUNCTION get_onboarding_status IS 'Returns onboarding status including farm_name for determining registration flow step';
