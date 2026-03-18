-- =============================================================================
-- Migration 055: Fix invite_user_by_phone_impl (re-apply 048 function body)
-- =============================================================================
-- Migration 048 rewrote invite_user_by_phone_impl to use gen_random_uuid()
-- instead of generate_random_code_impl(6), but the rewrite was never applied
-- to the live DB. Migration 054 then dropped generate_random_code_impl,
-- breaking invites with: "function private.generate_random_code_impl(integer)
-- does not exist".
--
-- Fix: Re-create both the private impl and public wrapper from 048.
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
    v_code TEXT;
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

    -- Normalize phone using shared helper
    v_normalized_phone := private.normalize_phone_e164(p_phone);

    IF v_normalized_phone IS NULL OR v_normalized_phone !~ '^\+1[0-9]{10}$' THEN
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

    -- Duplicate member check (auth.users.phone stores WITHOUT '+' prefix)
    IF EXISTS (
        SELECT 1
        FROM public.farm_members fm
        JOIN auth.users au ON au.id = fm.user_id
        WHERE private.normalize_phone_e164(au.phone) = v_normalized_phone
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

    -- UUID as code — no collision risk, no retry loop needed
    v_code := gen_random_uuid()::text;

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

-- Recreate public wrapper
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

GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
