-- =============================================================================
-- Migration 026: Split invited_name into first/last name columns
-- =============================================================================
-- The invite system stored a single `invited_name` field. The onboarding flow
-- requires separate first_name and last_name to properly auto-create user
-- profiles (the users table has separate columns, and the auto_display_name
-- trigger derives display_name from first_name || ' ' || last_name).
--
-- Changes:
--   1. Add invited_first_name and invited_last_name to farm_invites
--   2. Migrate existing data from invited_name
--   3. Drop invited_name column
--   4. Update invite_user_by_phone (private impl + public wrapper) — new signature
--   5. Update get_onboarding_status_impl — auto-create profile with first/last name
--   6. Re-grant permissions and reload PostgREST schema cache
-- =============================================================================

-- =============================================================================
-- 1. Schema changes: Add first/last name columns, migrate, drop old column
-- =============================================================================

ALTER TABLE farm_invites ADD COLUMN IF NOT EXISTS invited_first_name TEXT;
ALTER TABLE farm_invites ADD COLUMN IF NOT EXISTS invited_last_name TEXT;

-- Migrate existing data: split "First Last" into separate columns (if old column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'farm_invites' AND column_name = 'invited_name'
    ) THEN
        UPDATE public.farm_invites
        SET
            invited_first_name = SPLIT_PART(invited_name, ' ', 1),
            invited_last_name = COALESCE(
                NULLIF(SUBSTRING(invited_name FROM POSITION(' ' IN invited_name) + 1), ''),
                ''
            )
        WHERE invited_name IS NOT NULL AND invited_first_name IS NULL;
    END IF;
END $$;

ALTER TABLE farm_invites DROP COLUMN IF EXISTS invited_name;

-- =============================================================================
-- 2. Update private.invite_user_by_phone_impl — accept first/last name
-- =============================================================================
-- New signature: (UUID, TEXT, TEXT, TEXT, TEXT)
-- Params: p_farm_id, p_phone, p_first_name, p_last_name, p_role
-- =============================================================================

-- Drop old private impl (4-param: farm_id, phone, name, role)
DROP FUNCTION IF EXISTS private.invite_user_by_phone_impl(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION private.invite_user_by_phone_impl(
    p_farm_id UUID,
    p_phone TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT DEFAULT 'meter_checker'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_normalized_phone TEXT;
    v_digits TEXT;
    v_code TEXT;
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_role NOT IN ('admin', 'meter_checker') THEN
        RAISE EXCEPTION 'Invalid role. Must be ''admin'' or ''meter_checker''';
    END IF;

    -- Normalize phone to E.164 format (+1XXXXXXXXXX)
    v_normalized_phone := regexp_replace(p_phone, '[^0-9+]', '', 'g');
    v_digits := regexp_replace(v_normalized_phone, '[^0-9]', '', 'g');

    IF length(v_digits) = 10 THEN
        v_normalized_phone := '+1' || v_digits;
    ELSIF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
        v_normalized_phone := '+' || v_digits;
    END IF;

    IF v_normalized_phone !~ '^\+1[0-9]{10}$' THEN
        RAISE EXCEPTION 'Invalid phone number format. Expected US number (+1XXXXXXXXXX)';
    END IF;

    SELECT role INTO v_user_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_user_id;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    IF v_user_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'Only growers and admins can invite users';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.farm_members fm
        JOIN auth.users au ON au.id = fm.user_id
        WHERE au.phone = v_normalized_phone
        AND fm.farm_id = p_farm_id
    ) THEN
        RAISE EXCEPTION 'This phone number is already a member of the farm';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.farm_invites
        WHERE farm_id = p_farm_id
        AND invited_phone = v_normalized_phone
        AND expires_at > now()
        AND (max_uses IS NULL OR uses_count < max_uses)
    ) THEN
        RAISE EXCEPTION 'A pending invite already exists for this phone number';
    END IF;

    LOOP
        v_code := private.generate_random_code_impl(6);
        v_attempts := v_attempts + 1;

        IF NOT EXISTS (SELECT 1 FROM public.farm_invites WHERE code = v_code) THEN
            EXIT;
        END IF;

        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
        END IF;
    END LOOP;

    INSERT INTO public.farm_invites (code, farm_id, role, invited_phone, invited_first_name, invited_last_name, expires_at, max_uses, created_by)
    VALUES (
        v_code,
        p_farm_id,
        p_role,
        v_normalized_phone,
        p_first_name,
        p_last_name,
        now() + INTERVAL '30 days',
        1,
        v_user_id
    );

    RETURN v_code;
END;
$$;

-- =============================================================================
-- 3. Update private.get_onboarding_status_impl — use first/last name
-- =============================================================================
-- Change: SELECT invited_first_name, invited_last_name instead of invited_name
-- Change: INSERT INTO users with first_name, last_name instead of display_name
--         (the auto_display_name trigger handles display_name automatically)
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

                UPDATE public.farm_invites SET uses_count = uses_count + 1 WHERE code = v_invite.code;

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

-- =============================================================================
-- 4. Update public wrapper for invite_user_by_phone — new 5-param signature
-- =============================================================================

-- Drop old public wrapper (4-param signature)
DROP FUNCTION IF EXISTS public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT);

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

-- =============================================================================
-- 5. Re-grant permissions and reload schema
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(uuid,text,text,text,text) TO authenticated, anon, public;

-- Re-grant all other functions (idempotent, ensures nothing is missing)
GRANT EXECUTE ON FUNCTION public.create_farm_and_membership(text,text,text,text,text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.join_farm_with_code(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.create_invite_code(uuid,text,integer,integer) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_farm_memberships() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.revoke_farm_invite(text) TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
