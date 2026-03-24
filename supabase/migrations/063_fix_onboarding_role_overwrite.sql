-- =============================================================================
-- Migration 063: Fix get_onboarding_status_impl role overwrite
-- =============================================================================
-- Bug: When a super_admin logs in with 0 farms, migration 061's auto-bootstrap
--   block fires (v_farm_id IS NULL AND v_role = 'super_admin'). The INSERT
--   from farms inserts nothing (0 farms). Then the re-read on line 121-127
--   overwrites v_role back to NULL because farm_members is still empty.
--   Result: RPC returns role=null → frontend redirects to /no-subscription.
--
-- Fix: Preserve v_role across the re-read by only overwriting it when the
--   re-read actually finds rows.
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
    v_role TEXT;
    v_user_phone TEXT;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if user has a profile
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) INTO v_has_profile;

    -- Check existing farm membership (includes role)
    SELECT fm.farm_id, f.name, fm.role
    INTO v_farm_id, v_farm_name, v_role
    FROM public.farm_members fm
    JOIN public.farms f ON f.id = fm.farm_id
    WHERE fm.user_id = v_user_id
    ORDER BY fm.created_at ASC
    LIMIT 1;

    -- If no farm membership, try auto-match via phone invite
    IF v_farm_id IS NULL THEN
        SELECT phone INTO v_user_phone FROM auth.users WHERE id = v_user_id;

        -- Normalize auth phone to E.164 using shared helper
        v_user_phone := private.normalize_phone_e164(v_user_phone);

        IF v_user_phone IS NOT NULL THEN
            -- Trigger guarantees invited_phone is already normalized to +1XXXXXXXXXX
            SELECT fi.code, fi.farm_id, fi.role, fi.invited_first_name, fi.invited_last_name, fi.invited_email
            INTO v_invite
            FROM public.farm_invites fi
            WHERE fi.invited_phone = v_user_phone
            AND fi.expires_at > now()
            AND (fi.max_uses IS NULL OR fi.uses_count < fi.max_uses)
            ORDER BY fi.created_at DESC
            LIMIT 1;

            IF v_invite.farm_id IS NOT NULL THEN
                IF NOT v_has_profile THEN
                    INSERT INTO public.users (id, phone, first_name, last_name, email)
                    VALUES (
                        v_user_id,
                        v_user_phone,
                        COALESCE(v_invite.invited_first_name, 'User'),
                        COALESCE(v_invite.invited_last_name, ''),
                        v_invite.invited_email
                    )
                    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
                      WHERE public.users.email IS NULL AND EXCLUDED.email IS NOT NULL;
                    v_has_profile := TRUE;
                END IF;

                INSERT INTO public.farm_members (farm_id, user_id, role)
                VALUES (v_invite.farm_id, v_user_id, v_invite.role)
                ON CONFLICT (farm_id, user_id) DO NOTHING;

                -- Delete invite after successful auto-join (single-use)
                DELETE FROM public.farm_invites WHERE code = v_invite.code;

                v_farm_id := v_invite.farm_id;
                -- Read back actual role (may differ from invite if conflict was skipped)
                SELECT fm.role INTO v_role
                FROM public.farm_members fm
                WHERE fm.farm_id = v_farm_id AND fm.user_id = v_user_id;
                SELECT name INTO v_farm_name FROM public.farms WHERE id = v_farm_id;
            END IF;
        END IF;
    END IF;

    -- Fall back to JWT metadata for role (covers super_admin with no farm_members)
    IF v_role IS NULL THEN
        SELECT au.raw_app_meta_data->>'user_role' INTO v_role
        FROM auth.users au WHERE au.id = v_user_id;
    END IF;

    -- Auto-bootstrap: if super_admin with no farm membership, add to all existing farms
    IF v_farm_id IS NULL AND v_role = 'super_admin' THEN
        INSERT INTO public.farm_members (farm_id, user_id, role)
        SELECT f.id, v_user_id, 'super_admin'
        FROM public.farms f
        WHERE NOT EXISTS (
            SELECT 1 FROM public.farm_members fm
            WHERE fm.farm_id = f.id AND fm.user_id = v_user_id
        )
        ON CONFLICT (farm_id, user_id) DO NOTHING;

        -- Re-read first farm membership after bootstrap.
        -- Only overwrite v_role if rows were actually inserted (FOUND).
        -- When 0 farms exist, the INSERT inserts nothing and the re-read
        -- returns no rows — we must preserve v_role = 'super_admin'.
        SELECT fm.farm_id, f.name, fm.role
        INTO v_farm_id, v_farm_name, v_role
        FROM public.farm_members fm
        JOIN public.farms f ON f.id = fm.farm_id
        WHERE fm.user_id = v_user_id
        ORDER BY fm.created_at ASC
        LIMIT 1;

        -- Restore role if re-read found nothing (0 farms bootstrapped)
        IF NOT FOUND THEN
            v_role := 'super_admin';
        END IF;
    END IF;

    v_has_farm_membership := v_farm_id IS NOT NULL;

    RETURN json_build_object(
        'has_profile', v_has_profile,
        'has_farm_membership', v_has_farm_membership,
        'farm_id', v_farm_id,
        'farm_name', v_farm_name,
        'role', v_role
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

NOTIFY pgrst, 'reload schema';
