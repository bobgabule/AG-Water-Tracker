-- =============================================================================
-- Migration 019: Phone-based invite flow
-- =============================================================================
-- Implements a phone-based invite system where admins can invite users by phone
-- number. When an invited user signs in via OTP, get_onboarding_status()
-- auto-matches them to the farm and creates their profile + membership.
--
-- Changes:
--   1. Add invited_phone and invited_name columns to farm_invites
--   2. New RPC: invite_user_by_phone — creates a phone-targeted invite
--   3. Rewrite get_onboarding_status — auto-matches phone invites on login
--   4. New RPC: revoke_farm_invite — allows admins to delete an invite
-- =============================================================================

-- =============================================================================
-- 1. Schema changes: Add columns to farm_invites
-- =============================================================================

ALTER TABLE farm_invites ADD COLUMN IF NOT EXISTS invited_phone TEXT;
ALTER TABLE farm_invites ADD COLUMN IF NOT EXISTS invited_name TEXT;

CREATE INDEX IF NOT EXISTS idx_farm_invites_invited_phone
    ON farm_invites(invited_phone)
    WHERE invited_phone IS NOT NULL;

-- =============================================================================
-- 2. RPC: invite_user_by_phone
-- =============================================================================
-- Creates a phone-targeted invite for a farm. The invite is tied to a specific
-- phone number so it can be auto-matched when the user signs in via OTP.
--
-- Parameters:
--   p_farm_id: UUID of the farm to invite the user to
--   p_phone:   Phone number of the user to invite
--   p_name:    Display name for the invited user
--   p_role:    Role to assign (default: 'member')
--
-- Returns: The generated invite code (TEXT)
--
-- Errors:
--   - Not authenticated
--   - Invalid role
--   - Invalid phone number format
--   - Caller is not owner/admin of the farm
--   - Phone number is already a farm member
--   - Pending invite already exists for this phone + farm
-- =============================================================================

CREATE OR REPLACE FUNCTION invite_user_by_phone(
    p_farm_id UUID,
    p_phone TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'member'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Get the current user's ID
    v_user_id := auth.uid();

    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate role parameter
    IF p_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role. Must be ''admin'' or ''member''';
    END IF;

    -- Normalize phone to E.164 format (+1XXXXXXXXXX)
    -- Strip everything except digits and leading +
    v_normalized_phone := regexp_replace(p_phone, '[^0-9+]', '', 'g');
    v_digits := regexp_replace(v_normalized_phone, '[^0-9]', '', 'g');

    IF length(v_digits) = 10 THEN
        -- 10 digits: assume US number, prepend +1
        v_normalized_phone := '+1' || v_digits;
    ELSIF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
        -- 11 digits starting with 1: prepend +
        v_normalized_phone := '+' || v_digits;
    END IF;

    -- Validate final format is +1XXXXXXXXXX
    IF v_normalized_phone !~ '^\+1[0-9]{10}$' THEN
        RAISE EXCEPTION 'Invalid phone number format. Expected US number (+1XXXXXXXXXX)';
    END IF;

    -- Check if caller is owner or admin of the farm
    SELECT role INTO v_user_role
    FROM farm_members
    WHERE farm_id = p_farm_id AND user_id = v_user_id;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this farm';
    END IF;

    IF v_user_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can invite users';
    END IF;

    -- Check if phone is already a member of this farm
    IF EXISTS (
        SELECT 1
        FROM farm_members fm
        JOIN auth.users au ON au.id = fm.user_id
        WHERE au.phone = v_normalized_phone
        AND fm.farm_id = p_farm_id
    ) THEN
        RAISE EXCEPTION 'This phone number is already a member of the farm';
    END IF;

    -- Check if a pending invite already exists for this phone + farm
    IF EXISTS (
        SELECT 1
        FROM farm_invites
        WHERE farm_id = p_farm_id
        AND invited_phone = v_normalized_phone
        AND expires_at > now()
        AND (max_uses IS NULL OR uses_count < max_uses)
    ) THEN
        RAISE EXCEPTION 'A pending invite already exists for this phone number';
    END IF;

    -- Generate a unique code (with retry logic for collision handling)
    LOOP
        v_code := generate_random_code(6);
        v_attempts := v_attempts + 1;

        -- Check if code already exists in farm_invites
        IF NOT EXISTS (SELECT 1 FROM farm_invites WHERE code = v_code) THEN
            -- Also check if it conflicts with any farm's legacy invite_code
            IF NOT EXISTS (SELECT 1 FROM farms WHERE invite_code = v_code) THEN
                EXIT; -- Found a unique code
            END IF;
        END IF;

        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
        END IF;
    END LOOP;

    -- Insert the invite
    INSERT INTO farm_invites (code, farm_id, role, invited_phone, invited_name, expires_at, max_uses, created_by)
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

COMMENT ON FUNCTION invite_user_by_phone IS 'Creates a phone-targeted invite for a farm (owner/admin only)';

-- =============================================================================
-- 3. Rewrite: get_onboarding_status
-- =============================================================================
-- Updated to auto-match phone invites on login. After checking for an existing
-- farm membership, if none is found the function looks up the user's phone in
-- auth.users and searches farm_invites for a matching pending invite. If found,
-- it auto-creates the user profile (if needed) and farm membership, then
-- increments the invite's uses_count.
--
-- Returns: JSON object with:
--   - has_profile: boolean
--   - has_farm_membership: boolean
--   - farm_id: UUID | null
--   - farm_name: TEXT | null
-- =============================================================================

CREATE OR REPLACE FUNCTION get_onboarding_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SELECT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) INTO v_has_profile;

    -- Check existing farm membership
    SELECT fm.farm_id, f.name
    INTO v_farm_id, v_farm_name
    FROM farm_members fm
    JOIN farms f ON f.id = fm.farm_id
    WHERE fm.user_id = v_user_id
    ORDER BY fm.created_at ASC
    LIMIT 1;

    -- If no farm membership, try auto-match via phone invite
    IF v_farm_id IS NULL THEN
        -- Get phone from auth.users (available right after OTP verify)
        SELECT phone INTO v_user_phone FROM auth.users WHERE id = v_user_id;

        IF v_user_phone IS NOT NULL THEN
            -- Find a valid phone invite
            SELECT fi.code, fi.farm_id, fi.role, fi.invited_name
            INTO v_invite
            FROM farm_invites fi
            WHERE fi.invited_phone = v_user_phone
            AND fi.expires_at > now()
            AND (fi.max_uses IS NULL OR fi.uses_count < fi.max_uses)
            ORDER BY fi.created_at DESC
            LIMIT 1;

            IF v_invite.farm_id IS NOT NULL THEN
                -- Auto-create profile if needed
                IF NOT v_has_profile THEN
                    INSERT INTO users (id, phone, display_name)
                    VALUES (v_user_id, v_user_phone, COALESCE(v_invite.invited_name, 'User'))
                    ON CONFLICT (id) DO NOTHING;
                    v_has_profile := TRUE;
                END IF;

                -- Auto-create farm membership
                INSERT INTO farm_members (farm_id, user_id, role)
                VALUES (v_invite.farm_id, v_user_id, v_invite.role)
                ON CONFLICT (farm_id, user_id) DO NOTHING;

                -- Increment uses_count
                UPDATE farm_invites SET uses_count = uses_count + 1 WHERE code = v_invite.code;

                -- Set the matched farm info
                v_farm_id := v_invite.farm_id;
                SELECT name INTO v_farm_name FROM farms WHERE id = v_farm_id;
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

COMMENT ON FUNCTION get_onboarding_status IS 'Returns onboarding status with phone-invite auto-matching for determining registration flow step';

-- =============================================================================
-- 4. RPC: revoke_farm_invite
-- =============================================================================
-- Allows an owner or admin to delete an invite code from their farm.
--
-- Parameters:
--   p_code: The invite code to revoke
--
-- Returns: VOID
--
-- Errors:
--   - Not authenticated
--   - Invite not found
--   - Caller is not owner/admin of the invite's farm
-- =============================================================================

CREATE OR REPLACE FUNCTION revoke_farm_invite(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_invite_farm_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();

    -- Verify user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get the farm_id for the invite
    SELECT farm_id INTO v_invite_farm_id
    FROM farm_invites
    WHERE code = p_code;

    IF v_invite_farm_id IS NULL THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    -- Check if caller is owner or admin of the invite's farm
    SELECT role INTO v_user_role
    FROM farm_members
    WHERE farm_id = v_invite_farm_id AND user_id = v_user_id;

    IF v_user_role IS NULL OR v_user_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can revoke invites';
    END IF;

    -- Delete the invite
    DELETE FROM farm_invites WHERE code = p_code;
END;
$$;

COMMENT ON FUNCTION revoke_farm_invite IS 'Revokes (deletes) a farm invite code (owner/admin only)';
