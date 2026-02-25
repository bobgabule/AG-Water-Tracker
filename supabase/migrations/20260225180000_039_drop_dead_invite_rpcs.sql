-- =============================================================================
-- Migration 039: Drop dead invite code RPCs
-- =============================================================================
-- These functions are unused after the phone-based invite system (invite_user_by_phone)
-- replaced the generic invite code flow. No client code references them.
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_invite_code(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS private.create_invite_code_impl(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.join_farm_with_code(text);
DROP FUNCTION IF EXISTS private.join_farm_with_code_impl(text);
