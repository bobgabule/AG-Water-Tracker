-- =============================================================================
-- Migration 039: Seat limit enforcement in invite RPC
-- =============================================================================
-- Adds per-farm extra seat columns (extra_admin_seats, extra_meter_checker_seats)
-- and enforces tier-based seat limits in the invite_user_by_phone RPC.
-- Also fixes the phone format mismatch bug in the duplicate member check
-- (auth.users.phone stores WITHOUT '+' prefix).
-- =============================================================================

-- =============================================================================
-- 1. Schema changes — add extra seat columns to farms
-- =============================================================================

ALTER TABLE public.farms ADD COLUMN extra_admin_seats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.farms ADD COLUMN extra_meter_checker_seats INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- 2. Update private implementation with seat limit enforcement + phone fix
-- =============================================================================

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

    IF v_user_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'Only growers and admins can invite users';
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
-- 3. Recreate public SQL wrapper (required after updating private impl)
-- =============================================================================

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
    IS 'Creates a phone-targeted invite for a farm with seat limit enforcement (tier max + extra seats)';

-- =============================================================================
-- 4. Grants and schema reload
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(uuid,text,text,text,text)
    TO authenticated, anon, public;

NOTIFY pgrst, 'reload schema';
