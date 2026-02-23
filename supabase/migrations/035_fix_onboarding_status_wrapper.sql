-- =============================================================================
-- Migration 035: Recreate public wrapper for get_onboarding_status
-- =============================================================================
-- Phase 21: Login-Only Auth Flow (Gap Closure)
--
-- Migration 034 updated private.get_onboarding_status_impl() to add invite
-- auto-matching and deletion logic, but did NOT recreate the public wrapper.
-- The public wrapper (last created in migration 023) is a LANGUAGE sql function
-- whose body is inlined at creation time. Because it was not recreated after
-- migration 034, the RPC endpoint was still executing the OLD migration-016
-- function body, which has no phone-invite matching logic.
--
-- Fix: Recreate the public wrapper so it delegates to the updated private impl.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT private.get_onboarding_status_impl();
$$;

-- Re-grant permissions (idempotent)
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated, anon, public;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
