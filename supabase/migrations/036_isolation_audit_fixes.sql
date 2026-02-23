-- =============================================================================
-- Migration 035: Isolation Audit Fixes (Phase 22)
-- =============================================================================
-- Fixes identified during the Phase 22 Farm Data Isolation Audit:
--
--   1. Remove stale legacy invite_code fallback from join_farm_with_code_impl
--      The farms.invite_code column was dropped in migration 024, but the
--      join function still had a fallback path querying it. This would cause
--      a runtime error if the farm_invites lookup missed.
--
--   2. Add super_admin_user_id to app_settings
--      Provides a configurable setting for identifying the super admin account
--      without hardcoded user IDs. Starts empty until the account is created.
-- =============================================================================

-- =============================================================================
-- 1. Clean stale join_farm_with_code_impl
-- =============================================================================
-- Remove the legacy fallback to public.farms WHERE invite_code = p_code
-- (lines 187-203 in migration 020). The invite_code column was dropped in
-- migration 024, so this path would always fail with a column-not-found error.
-- Now: if no farm_invite matches, raise 'Invalid invite code' immediately.
-- Also removed: v_farm_id variable (v_invite.farm_id is used directly).

CREATE OR REPLACE FUNCTION private.join_farm_with_code_impl(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    p_code := UPPER(TRIM(p_code));

    -- Look up the invite code in farm_invites
    SELECT fi.farm_id, fi.role, fi.expires_at, fi.max_uses, fi.uses_count
    INTO v_invite
    FROM public.farm_invites fi
    WHERE fi.code = p_code;

    -- No fallback -- farm_invites is the only invite system
    IF v_invite.farm_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    IF v_invite.expires_at < now() THEN
        RAISE EXCEPTION 'Invite code has expired';
    END IF;

    IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
        RAISE EXCEPTION 'Invite code has reached maximum uses';
    END IF;

    IF EXISTS (SELECT 1 FROM public.farm_members WHERE farm_id = v_invite.farm_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'You are already a member of this farm';
    END IF;

    INSERT INTO public.farm_members (farm_id, user_id, role)
    VALUES (v_invite.farm_id, v_user_id, v_invite.role);

    UPDATE public.farm_invites
    SET uses_count = uses_count + 1
    WHERE code = p_code;

    RETURN v_invite.farm_id;
END;
$$;

-- =============================================================================
-- 2. Add super_admin_user_id to app_settings
-- =============================================================================
-- Configurable super admin identification. The value starts empty and will be
-- set when the super admin account is created. Uses ON CONFLICT for idempotency.

INSERT INTO public.app_settings (key, value)
VALUES ('super_admin_user_id', '')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 3. Notify PostgREST to reload schema cache
-- =============================================================================
-- No new grants needed -- existing grants from migration 024 cover these functions.

NOTIFY pgrst, 'reload schema';
