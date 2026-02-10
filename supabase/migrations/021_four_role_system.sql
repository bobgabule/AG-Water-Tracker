-- =============================================================================
-- Migration 021: Migrate to four-role system
-- =============================================================================
-- Renames the old 3-role system (owner/admin/member) to the new 4-role system
-- (super_admin/grower/admin/meter_checker) in a single atomic migration.
--
-- Role mapping:
--   owner  -> grower        (farm creator, full management access)
--   admin  -> admin         (unchanged — delegated management access)
--   member -> meter_checker (field worker, read meters)
--   (new)     super_admin   (reserved for platform-level access, not assignable via invite)
--
-- Why: The old naming was confusing — "owner" implied ownership rather than
-- farming role, and "member" was too generic. The new names reflect actual
-- agricultural roles: growers manage farms, meter checkers read water meters.
--
-- Strategy:
--   1. Update existing data BEFORE changing constraints (avoids CHECK violations)
--   2. Replace CHECK constraints with new role sets
--   3. Update helper functions so RLS policies auto-propagate
--   4. Update private schema functions with new role validation
--   5. Update public wrapper comments
-- =============================================================================

-- =============================================================================
-- Section 1: Update existing data (BEFORE constraint changes)
-- =============================================================================

-- Map old roles to new roles in farm_members
UPDATE farm_members SET role = 'grower' WHERE role = 'owner';
UPDATE farm_members SET role = 'meter_checker' WHERE role = 'member';
-- 'admin' stays 'admin', no update needed

-- Map old roles to new roles in farm_invites
UPDATE farm_invites SET role = 'meter_checker' WHERE role = 'member';
-- 'admin' stays 'admin', no update needed

-- =============================================================================
-- Section 2: Update CHECK constraints
-- =============================================================================

-- farm_members: drop old 3-role constraint, add new 4-role constraint
ALTER TABLE farm_members DROP CONSTRAINT IF EXISTS farm_members_role_check;
ALTER TABLE farm_members ADD CONSTRAINT farm_members_role_check
  CHECK (role IN ('super_admin', 'grower', 'admin', 'meter_checker'));

-- farm_invites: drop old constraint, add new (only invitable roles)
ALTER TABLE farm_invites DROP CONSTRAINT IF EXISTS farm_invites_role_check;
ALTER TABLE farm_invites ADD CONSTRAINT farm_invites_role_check
  CHECK (role IN ('admin', 'meter_checker'));

-- =============================================================================
-- Section 3: Update get_user_admin_farm_ids() helper function
-- =============================================================================
-- This function is used by all admin-gated RLS policies. Updating it here
-- automatically propagates the new role names to every policy that calls it.
-- get_user_farm_ids() does NOT need changes (returns all farms regardless of role).
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_admin_farm_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT farm_id
    FROM farm_members
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'grower', 'admin')
$$;

COMMENT ON FUNCTION get_user_admin_farm_ids IS 'Returns farm IDs where the current user is super_admin, grower, or admin';

-- =============================================================================
-- Section 4: Update private schema functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4a. create_farm_and_membership_impl
-- ---------------------------------------------------------------------------
-- Change: 'owner' -> 'grower' in the INSERT statement
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
    VALUES (v_farm_id, v_user_id, 'grower');

    RETURN v_farm_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4b. create_invite_code_impl
-- ---------------------------------------------------------------------------
-- Changes:
--   'admin', 'member' -> 'admin', 'meter_checker' (role validation)
--   'owner', 'admin'  -> 'super_admin', 'grower', 'admin' (permission check)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.create_invite_code_impl(
    p_farm_id UUID,
    p_role TEXT DEFAULT 'meter_checker',
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

    IF p_role NOT IN ('admin', 'meter_checker') THEN
        RAISE EXCEPTION 'Invalid role. Must be ''admin'' or ''meter_checker''';
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

    IF v_user_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'Only growers and admins can create invite codes';
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
-- 4c. invite_user_by_phone_impl
-- ---------------------------------------------------------------------------
-- Changes:
--   'admin', 'member' -> 'admin', 'meter_checker' (role validation)
--   'owner', 'admin'  -> 'super_admin', 'grower', 'admin' (permission check)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.invite_user_by_phone_impl(
    p_farm_id UUID,
    p_phone TEXT,
    p_name TEXT,
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
-- 4d. revoke_farm_invite_impl
-- ---------------------------------------------------------------------------
-- Changes:
--   'owner', 'admin' -> 'super_admin', 'grower', 'admin' (permission check)
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

    IF v_user_role IS NULL OR v_user_role NOT IN ('super_admin', 'grower', 'admin') THEN
        RAISE EXCEPTION 'Only growers and admins can revoke invites';
    END IF;

    DELETE FROM public.farm_invites WHERE code = p_code;
END;
$$;

-- =============================================================================
-- Section 5: Update public wrapper functions and comments
-- =============================================================================
-- The public wrappers for create_invite_code and invite_user_by_phone need
-- their DEFAULT values updated from 'member' to 'meter_checker' to match the
-- new role names. CREATE OR REPLACE with same arg types updates the defaults.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 5a. create_invite_code (update default role)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_invite_code(
    p_farm_id UUID,
    p_role TEXT DEFAULT 'meter_checker',
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
    IS 'Creates a new invite code for a farm (grower/admin only)';

-- ---------------------------------------------------------------------------
-- 5b. invite_user_by_phone (update default role)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invite_user_by_phone(
    p_farm_id UUID,
    p_phone TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'meter_checker'
)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT private.invite_user_by_phone_impl(p_farm_id, p_phone, p_name, p_role);
$$;

COMMENT ON FUNCTION public.invite_user_by_phone(UUID, TEXT, TEXT, TEXT)
    IS 'Creates a phone-targeted invite for a farm (grower/admin only)';

-- ---------------------------------------------------------------------------
-- 5c. Update remaining comments
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.create_farm_and_membership(TEXT, TEXT, TEXT, TEXT, TEXT)
    IS 'Atomically creates a farm with address fields and adds the calling user as grower';

COMMENT ON FUNCTION public.revoke_farm_invite(TEXT)
    IS 'Revokes (deletes) a farm invite code (grower/admin only)';
