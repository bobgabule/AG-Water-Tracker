-- =============================================================================
-- Migration 043: Rename role 'grower' to 'owner'
-- =============================================================================
-- Reverts the rename made in migration 021 (which renamed 'owner' -> 'grower').
-- 'Owner' better describes the farm creator's relationship to the farm.
--
-- Strategy:
--   1. Drop old CHECK constraint (old constraint rejects 'owner' as invalid)
--   2. Update existing data (safe now that constraint is removed)
--   3. Add new CHECK constraint with 'owner' replacing 'grower'
--   4. Recreate get_user_admin_farm_ids() so all admin-gated RLS policies
--      auto-propagate (they call this function, not hardcode the role)
--   5. Recreate all private impl functions that check role = 'grower'
--   6. Recreate corresponding public SQL wrappers (migration 035 pattern)
--   7. Re-grant permissions and reload PostgREST schema
--
-- NOTE: Migration 022 (custom_access_token_hook) has a header comment that
-- still lists 'grower' as a valid role value. The hook reads the role
-- dynamically from farm_members at runtime, so it works correctly after
-- this migration. The stale comment in 022 is superseded by this migration.
-- =============================================================================

-- =============================================================================
-- Section 1: Drop old CHECK constraint (must happen BEFORE data update,
-- because the old constraint rejects 'owner' as a valid value)
-- =============================================================================

ALTER TABLE public.farm_members DROP CONSTRAINT IF EXISTS farm_members_role_check;

-- =============================================================================
-- Section 2: Update existing data (now safe with constraint removed)
-- =============================================================================

UPDATE public.farm_members SET role = 'owner' WHERE role = 'grower';

-- =============================================================================
-- Section 3: Add new CHECK constraint
-- =============================================================================

ALTER TABLE public.farm_members ADD CONSTRAINT farm_members_role_check
  CHECK (role IN ('super_admin', 'owner', 'admin', 'meter_checker'));

-- =============================================================================
-- Section 4: Recreate get_user_admin_farm_ids()
-- =============================================================================
-- This function backs ALL admin-gated RLS policies. Updating it here
-- automatically propagates 'owner' to every policy that calls it.

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
    AND role IN ('super_admin', 'owner', 'admin')
$$;

COMMENT ON FUNCTION get_user_admin_farm_ids
  IS 'Returns farm IDs where the current user is super_admin, owner, or admin';

-- =============================================================================
-- Section 5: Recreate private impl functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 4a. create_farm_and_membership_impl (latest: migration 021)
-- Change: INSERT value 'grower' -> 'owner'
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
-- 4b. create_invite_code_impl (latest: migration 024)
-- Change: 'grower' -> 'owner' in permission check + error message
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

    IF v_user_role NOT IN ('super_admin', 'owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can create invite codes';
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
-- 4c. invite_user_by_phone_impl (latest: migration 040)
-- Change: 'grower' -> 'owner' in permission check + error message
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 4d. revoke_farm_invite_impl (latest: migration 021)
-- Change: 'grower' -> 'owner' in permission check + error message
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

    IF v_user_role IS NULL OR v_user_role NOT IN ('super_admin', 'owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can revoke invites';
    END IF;

    DELETE FROM public.farm_invites WHERE code = p_code;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4e. remove_farm_member_impl (latest: migration 027)
-- Change: 'grower' -> 'owner' in permission check + role hierarchy
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.remove_farm_member_impl(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cannot remove yourself
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot remove yourself from the farm';
    END IF;

    -- Get caller's role in this farm
    SELECT role INTO v_caller_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    -- Only super_admin, owner, admin can remove members
    IF v_caller_role NOT IN ('super_admin', 'owner', 'admin') THEN
        RAISE EXCEPTION 'You do not have permission to remove farm members';
    END IF;

    -- Get target's role in this farm
    SELECT role INTO v_target_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this farm';
    END IF;

    -- super_admin can remove any other user
    IF v_caller_role = 'super_admin' THEN
        -- allowed, skip further checks
        NULL;
    -- owner can remove admin and meter_checker, but not super_admin
    ELSIF v_caller_role = 'owner' THEN
        IF v_target_role = 'super_admin' THEN
            RAISE EXCEPTION 'Cannot remove a super admin';
        END IF;
        IF v_target_role = 'owner' THEN
            RAISE EXCEPTION 'Cannot remove the farm owner';
        END IF;
    -- admin can only remove meter_checker
    ELSIF v_caller_role = 'admin' THEN
        IF v_target_role <> 'meter_checker' THEN
            RAISE EXCEPTION 'Admins can only remove meter checkers';
        END IF;
    END IF;

    -- Delete the membership
    DELETE FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4f. disable_farm_member_impl (latest: migration 029)
-- Change: 'grower' -> 'owner' in permission check + role hierarchy
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.disable_farm_member_impl(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_target_disabled INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cannot disable yourself
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot disable yourself';
    END IF;

    -- Get caller's role in this farm
    SELECT role INTO v_caller_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    -- Only super_admin, owner, admin can disable members
    IF v_caller_role NOT IN ('super_admin', 'owner', 'admin') THEN
        RAISE EXCEPTION 'You do not have permission to disable farm members';
    END IF;

    -- Get target's role and disabled status in this farm
    SELECT role, is_disabled INTO v_target_role, v_target_disabled
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this farm';
    END IF;

    -- Cannot disable already-disabled user
    IF v_target_disabled = 1 THEN
        RAISE EXCEPTION 'User is already disabled';
    END IF;

    -- Enforce role hierarchy
    -- super_admin can disable anyone except themselves (already checked above)
    IF v_caller_role = 'super_admin' THEN
        NULL; -- allowed
    -- owner can disable admin and meter_checker, but not super_admin or owner
    ELSIF v_caller_role = 'owner' THEN
        IF v_target_role = 'super_admin' THEN
            RAISE EXCEPTION 'Cannot disable a super admin';
        END IF;
        IF v_target_role = 'owner' THEN
            RAISE EXCEPTION 'Cannot disable the farm owner';
        END IF;
    -- admin can only disable meter_checker
    ELSIF v_caller_role = 'admin' THEN
        IF v_target_role <> 'meter_checker' THEN
            RAISE EXCEPTION 'Admins can only disable meter checkers';
        END IF;
    END IF;

    -- Disable the member
    UPDATE public.farm_members
    SET is_disabled = 1
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4g. enable_farm_member_impl (latest: migration 029)
-- Change: 'grower' -> 'owner' in permission check + role hierarchy
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.enable_farm_member_impl(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_target_disabled INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Cannot enable yourself (shouldn't be possible since you'd be disabled, but guard anyway)
    IF v_caller_id = p_member_user_id THEN
        RAISE EXCEPTION 'Cannot enable yourself';
    END IF;

    -- Get caller's role in this farm
    SELECT role INTO v_caller_role
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = v_caller_id;

    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    -- Only super_admin, owner, admin can enable members
    IF v_caller_role NOT IN ('super_admin', 'owner', 'admin') THEN
        RAISE EXCEPTION 'You do not have permission to enable farm members';
    END IF;

    -- Get target's role and disabled status in this farm
    SELECT role, is_disabled INTO v_target_role, v_target_disabled
    FROM public.farm_members
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this farm';
    END IF;

    -- Cannot enable already-active user
    IF v_target_disabled = 0 THEN
        RAISE EXCEPTION 'User is not disabled';
    END IF;

    -- Enforce role hierarchy (same as disable)
    IF v_caller_role = 'super_admin' THEN
        NULL; -- allowed
    ELSIF v_caller_role = 'owner' THEN
        IF v_target_role = 'super_admin' THEN
            RAISE EXCEPTION 'Cannot enable a super admin';
        END IF;
        IF v_target_role = 'owner' THEN
            RAISE EXCEPTION 'Cannot enable the farm owner';
        END IF;
    ELSIF v_caller_role = 'admin' THEN
        IF v_target_role <> 'meter_checker' THEN
            RAISE EXCEPTION 'Admins can only enable meter checkers';
        END IF;
    END IF;

    -- Enable the member
    UPDATE public.farm_members
    SET is_disabled = 0
    WHERE farm_id = p_farm_id AND user_id = p_member_user_id;
END;
$$;

-- =============================================================================
-- Section 6: Recreate public SQL wrappers (update COMMENTs)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_farm_and_membership(
    p_farm_name TEXT,
    p_street_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_zip_code TEXT
)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.create_farm_and_membership_impl(p_farm_name, p_street_address, p_city, p_state, p_zip_code);
$$;

COMMENT ON FUNCTION public.create_farm_and_membership(TEXT, TEXT, TEXT, TEXT, TEXT)
    IS 'Atomically creates a farm with address fields and adds the calling user as owner';

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
    IS 'Creates a new invite code for a farm (owner/admin only)';

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

CREATE OR REPLACE FUNCTION public.revoke_farm_invite(p_code TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.revoke_farm_invite_impl(p_code);
$$;

COMMENT ON FUNCTION public.revoke_farm_invite(TEXT)
    IS 'Revokes (deletes) a farm invite code (owner/admin only)';

CREATE OR REPLACE FUNCTION public.remove_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.remove_farm_member_impl(p_farm_id, p_member_user_id);
$$;

COMMENT ON FUNCTION public.remove_farm_member(UUID, UUID)
    IS 'Removes a farm member (super_admin/owner/admin, role hierarchy enforced, cannot remove self)';

CREATE OR REPLACE FUNCTION public.disable_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.disable_farm_member_impl(p_farm_id, p_member_user_id);
$$;

COMMENT ON FUNCTION public.disable_farm_member(UUID, UUID)
    IS 'Disables a farm member (super_admin/owner/admin, role hierarchy enforced, cannot disable self)';

CREATE OR REPLACE FUNCTION public.enable_farm_member(
    p_farm_id UUID,
    p_member_user_id UUID
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.enable_farm_member_impl(p_farm_id, p_member_user_id);
$$;

COMMENT ON FUNCTION public.enable_farm_member(UUID, UUID)
    IS 'Re-enables a disabled farm member (super_admin/owner/admin, role hierarchy enforced)';

-- =============================================================================
-- Section 7: Grants and schema reload
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.create_farm_and_membership(text,text,text,text,text)
    TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.create_invite_code(uuid,text,integer,integer)
    TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(uuid,text,text,text,text)
    TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.revoke_farm_invite(text)
    TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.remove_farm_member(uuid, uuid)
    TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.disable_farm_member(uuid, uuid)
    TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.enable_farm_member(uuid, uuid)
    TO authenticated, anon, public;

NOTIFY pgrst, 'reload schema';
