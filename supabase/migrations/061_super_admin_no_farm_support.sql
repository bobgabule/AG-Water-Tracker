-- =============================================================================
-- Migration 061: Super admin no-farm login support
-- =============================================================================
-- Problem: Super admins with no farm_members rows (e.g. first login before any
--   farm exists, or newly promoted) get stuck on /no-subscription because:
--   1. get_onboarding_status returns role=null (only checks farm_members)
--   2. VerifyPage routes based solely on hasFarmMembership
--   3. The farm creation trigger only finds super_admins via farm_members
--
-- Fixes:
--   A. get_onboarding_status_impl: fall back to auth.users JWT metadata for role,
--      and auto-bootstrap super_admin into all existing farms on login
--   B. add_super_admins_to_new_farm trigger: also find super_admins via JWT metadata
-- =============================================================================

-- =============================================================================
-- A. Update get_onboarding_status_impl — role fallback + auto-bootstrap
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

        -- Re-read first farm membership after bootstrap
        SELECT fm.farm_id, f.name, fm.role
        INTO v_farm_id, v_farm_name, v_role
        FROM public.farm_members fm
        JOIN public.farms f ON f.id = fm.farm_id
        WHERE fm.user_id = v_user_id
        ORDER BY fm.created_at ASC
        LIMIT 1;
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

-- =============================================================================
-- B. Update farm creation trigger — find super_admins via JWT metadata too
-- =============================================================================
-- Covers super_admins who have no farm_members rows yet (brand new, never
-- added to any farm). The original trigger only checked farm_members.

CREATE OR REPLACE FUNCTION public.add_super_admins_to_new_farm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.farm_members (farm_id, user_id, role)
  SELECT NEW.id, sa.user_id, 'super_admin'
  FROM (
    -- Super admins already in farm_members
    SELECT DISTINCT fm.user_id
    FROM public.farm_members fm
    WHERE fm.role = 'super_admin'
    UNION
    -- Super admins identified via JWT metadata (no farm_members rows yet)
    SELECT au.id
    FROM auth.users au
    WHERE au.raw_app_meta_data->>'user_role' = 'super_admin'
  ) sa
  ON CONFLICT (farm_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger already exists from migration 025, function is replaced in-place

-- =============================================================================
-- C. Reload PostgREST schema cache
-- =============================================================================

NOTIFY pgrst, 'reload schema';
