-- =============================================================================
-- Migration 023: Fix public wrapper functions — SECURITY INVOKER → DEFINER
-- =============================================================================
-- Migration 020 moved privileged functions to the private schema and created
-- public SECURITY INVOKER wrappers. However, the authenticated role has no
-- USAGE on the private schema (by design), so SECURITY INVOKER wrappers
-- cannot call private.* functions — they get 403 Forbidden via PostgREST.
--
-- Fix: Change all public wrappers to SECURITY DEFINER. This is safe because:
--   1. The wrappers are thin delegates — they just call private.*_impl()
--   2. All auth checks (auth.uid()) happen inside the private functions
--   3. SET search_path = '' prevents search_path injection attacks
--   4. auth.uid() still returns the correct user even under SECURITY DEFINER
--      because PostgREST sets session variables before calling the function
-- =============================================================================

-- 1. create_farm_and_membership
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

-- 2. join_farm_with_code
CREATE OR REPLACE FUNCTION public.join_farm_with_code(p_code TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.join_farm_with_code_impl(p_code);
$$;

-- 3. create_invite_code (updated defaults from migration 021)
CREATE OR REPLACE FUNCTION public.create_invite_code(
    p_farm_id UUID,
    p_role TEXT DEFAULT 'meter_checker',
    p_expires_days INTEGER DEFAULT 7,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.create_invite_code_impl(p_farm_id, p_role, p_expires_days, p_max_uses);
$$;

-- 4. get_onboarding_status
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.get_onboarding_status_impl();
$$;

-- 5. get_user_farm_memberships
CREATE OR REPLACE FUNCTION public.get_user_farm_memberships()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.get_user_farm_memberships_impl();
$$;

-- 6. invite_user_by_phone (updated defaults from migration 021)
CREATE OR REPLACE FUNCTION public.invite_user_by_phone(
    p_farm_id UUID,
    p_phone TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'meter_checker'
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.invite_user_by_phone_impl(p_farm_id, p_phone, p_name, p_role);
$$;

-- 7. revoke_farm_invite
CREATE OR REPLACE FUNCTION public.revoke_farm_invite(p_code TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.revoke_farm_invite_impl(p_code);
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
