-- =============================================================================
-- Migration 037: Fix phone format mismatch in auto-join
-- =============================================================================
-- Supabase Auth stores phone WITHOUT '+' prefix (e.g., '18029624008')
-- but farm_invites stores WITH '+' prefix (e.g., '+18029624008').
-- The equality check in get_onboarding_status_impl fails silently.
--
-- Fix: Normalize v_user_phone to E.164 format (add '+' if missing)
-- before matching against farm_invites.invited_phone.
-- =============================================================================

CREATE OR REPLACE FUNCTION private.get_onboarding_status_impl()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_has_profile BOOLEAN;
    v_has_farm_membership BOOLEAN;
    v_farm_id UUID;
    v_farm_name TEXT;
    v_user_phone TEXT;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if user has a profile
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_has_profile;

    -- Check existing farm membership
    SELECT fm.farm_id, f.name
    INTO v_farm_id, v_farm_name
    FROM public.farm_members fm
    JOIN public.farms f ON f.id = fm.farm_id
    WHERE fm.user_id = v_user_id
    ORDER BY fm.created_at ASC
    LIMIT 1;

    -- If no farm membership, try auto-match via phone invite
    IF v_farm_id IS NULL THEN
        SELECT phone INTO v_user_phone FROM auth.users WHERE id = v_user_id;

        -- Normalize to E.164: Supabase Auth may store without '+' prefix
        IF v_user_phone IS NOT NULL AND left(v_user_phone, 1) != '+' THEN
            v_user_phone := '+' || v_user_phone;
        END IF;

        IF v_user_phone IS NOT NULL THEN
            SELECT fi.code, fi.farm_id, fi.role, fi.invited_first_name, fi.invited_last_name
            INTO v_invite
            FROM public.farm_invites fi
            WHERE fi.invited_phone = v_user_phone
            AND fi.expires_at > now()
            AND (fi.max_uses IS NULL OR fi.uses_count < fi.max_uses)
            ORDER BY fi.created_at DESC
            LIMIT 1;

            IF v_invite.farm_id IS NOT NULL THEN
                IF NOT v_has_profile THEN
                    INSERT INTO public.users (id, phone, first_name, last_name)
                    VALUES (
                        v_user_id,
                        v_user_phone,
                        COALESCE(v_invite.invited_first_name, 'User'),
                        COALESCE(v_invite.invited_last_name, '')
                    )
                    ON CONFLICT (id) DO NOTHING;
                    v_has_profile := TRUE;
                END IF;

                INSERT INTO public.farm_members (farm_id, user_id, role)
                VALUES (v_invite.farm_id, v_user_id, v_invite.role)
                ON CONFLICT (farm_id, user_id) DO NOTHING;

                -- Delete invite after successful auto-join (single-use)
                DELETE FROM public.farm_invites WHERE code = v_invite.code;

                v_farm_id := v_invite.farm_id;
                SELECT name INTO v_farm_name FROM public.farms WHERE id = v_farm_id;
            END IF;
        END IF;
    END IF;

    v_has_farm_membership := v_farm_id IS NOT NULL;

    RETURN json_build_object(
        'has_profile', v_has_profile,
        'has_farm_membership', v_has_farm_membership,
        'farm_id', v_farm_id,
        'farm_name', v_farm_name
    );
END;
$$;

-- Recreate public wrapper to pick up updated impl
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.get_onboarding_status_impl();
$$;

-- Re-grant permissions (idempotent)
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
