-- =============================================================================
-- Migration 024: Fix search_path = '' cascade issues + legacy invite cleanup
-- =============================================================================
-- Migration 020 set `SET search_path = ''` on all private schema functions.
-- This breaks trigger functions that use unqualified table references, because
-- triggers inherit the calling function's search_path.
--
-- Fixes:
--   1. Drop legacy farm invite code system (trigger, functions, column)
--   2. Fix trigger functions to use fully qualified public.* references
--   3. Remove farms.invite_code collision checks from private functions
--   4. Grant EXECUTE on all public wrappers to authenticated/anon roles
-- =============================================================================

-- =============================================================================
-- 1. Drop legacy farm invite code system
-- =============================================================================
-- The old system auto-generated a static invite_code per farm. The new system
-- uses farm_invites with per-user phone-based invites (migration 019).

DROP TRIGGER IF EXISTS set_invite_code ON farms;
DROP FUNCTION IF EXISTS set_farm_invite_code();
DROP FUNCTION IF EXISTS generate_invite_code();
ALTER TABLE farms DROP COLUMN IF EXISTS invite_code;

-- =============================================================================
-- 2. Fix trigger functions — qualify all table references
-- =============================================================================
-- These triggers fire during INSERTs called by private.* functions that have
-- SET search_path = ''. The empty search_path cascades to the trigger, so
-- unqualified table names like 'users' fail with "relation does not exist".

CREATE OR REPLACE FUNCTION set_farm_member_full_name()
RETURNS TRIGGER
SECURITY INVOKER
AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(display_name, phone, 'Unknown') INTO user_name
  FROM public.users WHERE id = NEW.user_id;

  IF NEW.full_name IS NULL THEN
    NEW.full_name := user_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_farm_member_full_name()
RETURNS TRIGGER
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.farm_members
  SET full_name = COALESCE(NEW.display_name, NEW.phone, 'Unknown')
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. Remove farms.invite_code collision checks from private functions
-- =============================================================================
-- The invite_code column was dropped above, so these functions would fail
-- when checking `SELECT 1 FROM public.farms WHERE invite_code = v_code`.

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

-- =============================================================================
-- 4. Grant EXECUTE on all public wrappers
-- =============================================================================
-- Ensures PostgREST can discover and expose these functions for both
-- authenticated and anonymous roles.

GRANT EXECUTE ON FUNCTION public.create_farm_and_membership(text,text,text,text,text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.join_farm_with_code(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.create_invite_code(uuid,text,integer,integer) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.get_user_farm_memberships() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.invite_user_by_phone(uuid,text,text,text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.revoke_farm_invite(text) TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
