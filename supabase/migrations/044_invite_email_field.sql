-- =============================================================================
-- Migration 044: Add optional email field to invite flow
-- =============================================================================
-- Adds invited_email column to farm_invites so admins can capture email
-- during invite. On auto-join, the email is passed to the users table.
-- =============================================================================

-- Section 1: Add column with email format check
ALTER TABLE public.farm_invites ADD COLUMN IF NOT EXISTS invited_email TEXT;

ALTER TABLE public.farm_invites ADD CONSTRAINT farm_invites_email_format
  CHECK (invited_email IS NULL OR invited_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- =============================================================================
-- Section 2: Recreate invite_user_by_phone_impl with p_email parameter
-- =============================================================================

CREATE OR REPLACE FUNCTION private.invite_user_by_phone_impl(
    p_farm_id UUID,
    p_phone TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT DEFAULT 'meter_checker',
    p_email TEXT DEFAULT NULL
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
    v_active_count INTEGER;
    v_pending_count INTEGER;
    v_tier_limit INTEGER;
    v_extra_seats INTEGER;
    v_effective_limit INTEGER;
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

    IF v_user_role NOT IN ('super_admin', 'owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can invite users';
    END IF;

    -- Admins can only invite meter_checkers (prevent role escalation)
    IF v_user_role = 'admin' AND p_role <> 'meter_checker' THEN
        RAISE EXCEPTION 'Admins can only invite meter checkers';
    END IF;

    -- Seat limit enforcement: count active members + pending invites vs tier limit
    SELECT COUNT(*) INTO v_active_count
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND role = p_role;

    SELECT COUNT(*) INTO v_pending_count
    FROM public.farm_invites
    WHERE farm_id = p_farm_id AND role = p_role
      AND expires_at > now()
      AND (max_uses IS NULL OR uses_count < max_uses);

    SELECT
      CASE WHEN p_role = 'admin' THEN st.max_admins ELSE st.max_meter_checkers END,
      CASE WHEN p_role = 'admin' THEN f.extra_admin_seats ELSE f.extra_meter_checker_seats END
    INTO v_tier_limit, v_extra_seats
    FROM public.farms f
    JOIN public.subscription_tiers st ON st.slug = f.subscription_tier
    WHERE f.id = p_farm_id;

    v_effective_limit := COALESCE(v_tier_limit, 0) + COALESCE(v_extra_seats, 0);

    IF (v_active_count + v_pending_count) >= v_effective_limit THEN
        RAISE EXCEPTION 'No available % seats. Your plan allows % (% active, % pending).',
          p_role, v_effective_limit, v_active_count, v_pending_count;
    END IF;

    -- Duplicate member check (fixed: auth.users.phone stores WITHOUT '+' prefix)
    IF EXISTS (
        SELECT 1
        FROM public.farm_members fm
        JOIN auth.users au ON au.id = fm.user_id
        WHERE '+' || au.phone = v_normalized_phone
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

    INSERT INTO public.farm_invites (code, farm_id, role, invited_phone, invited_first_name, invited_last_name, invited_email, expires_at, max_uses, created_by)
    VALUES (
        v_code,
        p_farm_id,
        p_role,
        v_normalized_phone,
        p_first_name,
        p_last_name,
        p_email,
        now() + INTERVAL '30 days',
        1,
        v_user_id
    );

    RETURN v_code;
END;
$$;

-- =============================================================================
-- Section 3: Recreate public wrapper with p_email parameter
-- =============================================================================

-- Drop old signature first (different param count)
DROP FUNCTION IF EXISTS public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.invite_user_by_phone(
    p_farm_id UUID,
    p_phone TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT DEFAULT 'meter_checker',
    p_email TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.invite_user_by_phone_impl(p_farm_id, p_phone, p_first_name, p_last_name, p_role, p_email);
$$;

COMMENT ON FUNCTION public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
    IS 'Creates a phone-targeted invite for a farm with seat limit enforcement and optional email';

GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- Section 4: Recreate get_onboarding_status_impl to pass email on auto-join
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

-- Recreate public wrapper
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.get_onboarding_status_impl();
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
