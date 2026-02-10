-- =============================================================================
-- Migration 020: Move SECURITY DEFINER functions to private schema
-- =============================================================================
-- Security hardening: All 8 SECURITY DEFINER functions are moved to a private
-- schema that is not accessible via the PostgREST API. Public-facing functions
-- are replaced with SECURITY INVOKER wrappers that delegate to the private
-- implementations. This prevents direct invocation of privileged functions
-- through the Supabase REST API.
--
-- Functions moved:
--   1. generate_random_code(integer)           -- fully private, no public wrapper
--   2. create_farm_and_membership(text x5)     -- public INVOKER wrapper
--   3. join_farm_with_code(text)               -- public INVOKER wrapper
--   4. create_invite_code(uuid, text, int, int)-- public INVOKER wrapper
--   5. get_onboarding_status()                 -- public INVOKER wrapper
--   6. get_user_farm_memberships()             -- public INVOKER wrapper
--   7. invite_user_by_phone(uuid, text x3)     -- public INVOKER wrapper
--   8. revoke_farm_invite(text)                -- public INVOKER wrapper
-- =============================================================================

-- =============================================================================
-- 1. Create private schema and set permissions
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO postgres;
GRANT USAGE ON SCHEMA private TO service_role;

-- =============================================================================
-- 2. Create private implementations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2a. generate_random_code_impl (FULLY PRIVATE -- no public wrapper)
-- ---------------------------------------------------------------------------
-- Helper function used only by other private functions.
-- Removed from public schema entirely to prevent API exposure.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.generate_random_code_impl(p_length INTEGER DEFAULT 6)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..p_length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2b. create_farm_and_membership_impl
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.create_farm_and_membership_impl(
    p_farm_name TEXT,
    p_street_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_zip_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_farm_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate input lengths
    IF length(p_farm_name) > 255 THEN
        RAISE EXCEPTION 'Farm name too long (max 255 characters)';
    END IF;
    IF length(p_street_address) > 500 THEN
        RAISE EXCEPTION 'Street address too long (max 500 characters)';
    END IF;
    IF length(p_city) > 100 THEN
        RAISE EXCEPTION 'City name too long (max 100 characters)';
    END IF;
    IF length(p_state) > 2 THEN
        RAISE EXCEPTION 'State must be a 2-letter abbreviation';
    END IF;
    IF length(p_zip_code) > 10 THEN
        RAISE EXCEPTION 'ZIP code too long (max 10 characters)';
    END IF;

    -- Validate required fields
    IF trim(p_farm_name) = '' THEN
        RAISE EXCEPTION 'Farm name is required';
    END IF;
    IF trim(p_street_address) = '' THEN
        RAISE EXCEPTION 'Street address is required';
    END IF;
    IF trim(p_city) = '' THEN
        RAISE EXCEPTION 'City is required';
    END IF;
    IF trim(p_state) = '' THEN
        RAISE EXCEPTION 'State is required';
    END IF;
    IF trim(p_zip_code) = '' THEN
        RAISE EXCEPTION 'ZIP code is required';
    END IF;

    INSERT INTO public.farms (name, street_address, city, state, zip_code)
    VALUES (trim(p_farm_name), trim(p_street_address), trim(p_city), trim(p_state), trim(p_zip_code))
    RETURNING id INTO v_farm_id;

    INSERT INTO public.farm_members (farm_id, user_id, role)
    VALUES (v_farm_id, v_user_id, 'owner');

    RETURN v_farm_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2c. join_farm_with_code_impl
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.join_farm_with_code_impl(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
    v_farm_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    p_code := UPPER(TRIM(p_code));

    -- Try farm_invites first
    SELECT fi.farm_id, fi.role, fi.expires_at, fi.max_uses, fi.uses_count
    INTO v_invite
    FROM public.farm_invites fi
    WHERE fi.code = p_code;

    IF v_invite.farm_id IS NOT NULL THEN
        IF v_invite.expires_at < now() THEN
            RAISE EXCEPTION 'Invite code has expired';
        END IF;

        IF v_invite.max_uses IS NOT NULL AND v_invite.uses_count >= v_invite.max_uses THEN
            RAISE EXCEPTION 'Invite code has reached maximum uses';
        END IF;

        v_farm_id := v_invite.farm_id;

        IF EXISTS (SELECT 1 FROM public.farm_members WHERE farm_id = v_farm_id AND user_id = v_user_id) THEN
            RAISE EXCEPTION 'You are already a member of this farm';
        END IF;

        INSERT INTO public.farm_members (farm_id, user_id, role)
        VALUES (v_farm_id, v_user_id, v_invite.role);

        UPDATE public.farm_invites
        SET uses_count = uses_count + 1
        WHERE code = p_code;

        RETURN v_farm_id;
    END IF;

    -- Fallback: legacy invite codes on farms table
    SELECT id INTO v_farm_id
    FROM public.farms
    WHERE invite_code = p_code;

    IF v_farm_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code';
    END IF;

    IF EXISTS (SELECT 1 FROM public.farm_members WHERE farm_id = v_farm_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'You are already a member of this farm';
    END IF;

    INSERT INTO public.farm_members (farm_id, user_id, role)
    VALUES (v_farm_id, v_user_id, 'member');

    RETURN v_farm_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2d. create_invite_code_impl
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.create_invite_code_impl(
    p_farm_id UUID,
    p_role TEXT DEFAULT 'member',
    p_expires_days INTEGER DEFAULT 7,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
    v_code TEXT;
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role. Must be ''admin'' or ''member''';
    END IF;

    IF p_expires_days <= 0 THEN
        RAISE EXCEPTION 'Expiration days must be positive';
    END IF;

    IF p_max_uses IS NOT NULL AND p_max_uses <= 0 THEN
        RAISE EXCEPTION 'Max uses must be positive or NULL for unlimited';
    END IF;

    SELECT role INTO v_user_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_user_id;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    IF v_user_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can create invite codes';
    END IF;

    LOOP
        v_code := private.generate_random_code_impl(6);
        v_attempts := v_attempts + 1;

        IF NOT EXISTS (SELECT 1 FROM public.farm_invites WHERE code = v_code) THEN
            IF NOT EXISTS (SELECT 1 FROM public.farms WHERE invite_code = v_code) THEN
                EXIT;
            END IF;
        END IF;

        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
        END IF;
    END LOOP;

    INSERT INTO public.farm_invites (code, farm_id, role, expires_at, max_uses, created_by)
    VALUES (
        v_code,
        p_farm_id,
        p_role,
        now() + (p_expires_days || ' days')::INTERVAL,
        p_max_uses,
        v_user_id
    );

    RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2e. get_onboarding_status_impl
-- ---------------------------------------------------------------------------

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
            SELECT fi.code, fi.farm_id, fi.role, fi.invited_name
            INTO v_invite
            FROM public.farm_invites fi
            WHERE fi.invited_phone = v_user_phone
            AND fi.expires_at > now()
            AND (fi.max_uses IS NULL OR fi.uses_count < fi.max_uses)
            ORDER BY fi.created_at DESC
            LIMIT 1;

            IF v_invite.farm_id IS NOT NULL THEN
                IF NOT v_has_profile THEN
                    INSERT INTO public.users (id, phone, display_name)
                    VALUES (v_user_id, v_user_phone, COALESCE(v_invite.invited_name, 'User'))
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

-- ---------------------------------------------------------------------------
-- 2f. get_user_farm_memberships_impl
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.get_user_farm_memberships_impl()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT COALESCE(json_agg(
        json_build_object(
            'id', fm.id,
            'farm_id', fm.farm_id,
            'farm_name', f.name,
            'role', fm.role,
            'created_at', fm.created_at
        ) ORDER BY fm.created_at ASC
    ), '[]'::json)
    INTO v_result
    FROM public.farm_members fm
    JOIN public.farms f ON f.id = fm.farm_id
    WHERE fm.user_id = v_user_id;

    RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2g. invite_user_by_phone_impl
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.invite_user_by_phone_impl(
    p_farm_id UUID,
    p_phone TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'member'
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

    IF p_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role. Must be ''admin'' or ''member''';
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

    IF v_user_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can invite users';
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
            IF NOT EXISTS (SELECT 1 FROM public.farms WHERE invite_code = v_code) THEN
                EXIT;
            END IF;
        END IF;

        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
        END IF;
    END LOOP;

    INSERT INTO public.farm_invites (code, farm_id, role, invited_phone, invited_name, expires_at, max_uses, created_by)
    VALUES (
        v_code,
        p_farm_id,
        p_role,
        v_normalized_phone,
        p_name,
        now() + INTERVAL '30 days',
        1,
        v_user_id
    );

    RETURN v_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2h. revoke_farm_invite_impl
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.revoke_farm_invite_impl(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_invite_farm_id UUID;
    v_user_role TEXT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT farm_id INTO v_invite_farm_id
    FROM public.farm_invites
    WHERE code = p_code;

    IF v_invite_farm_id IS NULL THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    SELECT role INTO v_user_role
    FROM public.farm_members
    WHERE farm_id = v_invite_farm_id AND user_id = v_user_id;

    IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can revoke invites';
    END IF;

    DELETE FROM public.farm_invites WHERE code = p_code;
END;
$$;

-- =============================================================================
-- 3. Drop old public SECURITY DEFINER functions
-- =============================================================================
-- Drop with exact signatures to avoid breaking overloaded functions.
-- These are replaced by the SECURITY INVOKER wrappers below.
-- =============================================================================

DROP FUNCTION IF EXISTS public.generate_random_code(INTEGER);
DROP FUNCTION IF EXISTS public.create_farm_and_membership(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.join_farm_with_code(TEXT);
DROP FUNCTION IF EXISTS public.create_invite_code(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_onboarding_status();
DROP FUNCTION IF EXISTS public.get_user_farm_memberships();
DROP FUNCTION IF EXISTS public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.revoke_farm_invite(TEXT);

-- =============================================================================
-- 4. Create public SECURITY INVOKER wrappers
-- =============================================================================
-- These maintain identical signatures so existing client code
-- (e.g. supabase.rpc('get_onboarding_status')) continues to work unchanged.
-- generate_random_code is intentionally NOT given a public wrapper.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4a. create_farm_and_membership (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_farm_and_membership(
    p_farm_name TEXT,
    p_street_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_zip_code TEXT
)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.create_farm_and_membership_impl(p_farm_name, p_street_address, p_city, p_state, p_zip_code);
$$;

COMMENT ON FUNCTION public.create_farm_and_membership(TEXT, TEXT, TEXT, TEXT, TEXT)
    IS 'Atomically creates a farm with address fields and adds the calling user as owner';

-- ---------------------------------------------------------------------------
-- 4b. join_farm_with_code (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.join_farm_with_code(p_code TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.join_farm_with_code_impl(p_code);
$$;

COMMENT ON FUNCTION public.join_farm_with_code(TEXT)
    IS 'Joins a farm using an invite code, creating a farm membership';

-- ---------------------------------------------------------------------------
-- 4c. create_invite_code (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_invite_code(
    p_farm_id UUID,
    p_role TEXT DEFAULT 'member',
    p_expires_days INTEGER DEFAULT 7,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.create_invite_code_impl(p_farm_id, p_role, p_expires_days, p_max_uses);
$$;

COMMENT ON FUNCTION public.create_invite_code(UUID, TEXT, INTEGER, INTEGER)
    IS 'Creates a new invite code for a farm (owner/admin only)';

-- ---------------------------------------------------------------------------
-- 4d. get_onboarding_status (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSON
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.get_onboarding_status_impl();
$$;

COMMENT ON FUNCTION public.get_onboarding_status()
    IS 'Returns onboarding status with phone-invite auto-matching for determining registration flow step';

-- ---------------------------------------------------------------------------
-- 4e. get_user_farm_memberships (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_farm_memberships()
RETURNS JSON
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.get_user_farm_memberships_impl();
$$;

COMMENT ON FUNCTION public.get_user_farm_memberships()
    IS 'Returns all farm memberships for the current user';

-- ---------------------------------------------------------------------------
-- 4f. invite_user_by_phone (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invite_user_by_phone(
    p_farm_id UUID,
    p_phone TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'member'
)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.invite_user_by_phone_impl(p_farm_id, p_phone, p_name, p_role);
$$;

COMMENT ON FUNCTION public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT)
    IS 'Creates a phone-targeted invite for a farm (owner/admin only)';

-- ---------------------------------------------------------------------------
-- 4g. revoke_farm_invite (SECURITY INVOKER wrapper)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_farm_invite(p_code TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.revoke_farm_invite_impl(p_code);
$$;

COMMENT ON FUNCTION public.revoke_farm_invite(TEXT)
    IS 'Revokes (deletes) a farm invite code (owner/admin only)';
