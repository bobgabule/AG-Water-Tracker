-- =============================================================================
-- Migration 062: Fix custom_access_token_hook super_admin fallback
-- =============================================================================
-- Problem: The hook only reads role from farm_members. When a super_admin has
--   no farm_members rows (e.g. first login before any farm exists), the hook
--   sets user_role=null in the JWT — even if raw_app_meta_data has
--   user_role='super_admin' (set via Supabase Dashboard).
--
-- Fix: Fall back to auth.users.raw_app_meta_data->>'user_role' when
--   farm_members has no rows. This keeps the JWT consistent with the RPC
--   fallback added in migration 061.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  v_user_id uuid;
  v_role text;
  v_farm_id uuid;
BEGIN
  v_user_id := (event->>'user_id')::uuid;

  -- Primary: get role + farm from farm_members
  SELECT fm.role, fm.farm_id
  INTO v_role, v_farm_id
  FROM public.farm_members fm
  WHERE fm.user_id = v_user_id
  ORDER BY fm.created_at ASC
  LIMIT 1;

  -- Fallback: if no farm_members row exists, preserve admin-set role from
  -- raw_app_meta_data (e.g. super_admin promoted via Supabase Dashboard before
  -- any farm exists). Uses NOT FOUND (not v_role IS NULL) to avoid falling
  -- through when a farm_members row exists with a NULL role value.
  -- Note: supabase_auth_admin owns the auth schema, so SELECT on auth.users
  -- is implicitly granted. The lookup hits auth.users.id (PK), ~0ms.
  IF NOT FOUND THEN
    SELECT au.raw_app_meta_data->>'user_role' INTO v_role
    FROM auth.users au WHERE au.id = v_user_id;
  END IF;

  claims := event->'claims';

  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  IF v_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{app_metadata, farm_id}',
      CASE WHEN v_farm_id IS NOT NULL THEN to_jsonb(v_farm_id::text) ELSE 'null'::jsonb END);
  ELSE
    claims := jsonb_set(claims, '{app_metadata, user_role}', 'null');
    claims := jsonb_set(claims, '{app_metadata, farm_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Re-issue grants (CREATE OR REPLACE resets ACLs)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

NOTIFY pgrst, 'reload schema';
