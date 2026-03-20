-- =============================================================================
-- Migration 058: Fix Supabase Security Advisor issues
-- =============================================================================
-- Fixes:
--   1. Set search_path on 6 public functions (mutable search path warnings)
--   2. Enable RLS on spatial_ref_sys (PostGIS system table)
--   3. Drop unused uuid-ossp extension
-- =============================================================================

-- =============================================================================
-- 1. Fix function search paths
-- =============================================================================
-- All 6 public functions flagged for mutable search_path. Adding
-- SET search_path = '' to each. Table references already fully qualified
-- except cascade_well_farm_id_change which needs public.allocations.

-- 1a. update_updated_at_column (from migration 001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 1b. set_display_name_from_names (from migration 003)
CREATE OR REPLACE FUNCTION set_display_name_from_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
        NEW.display_name := NEW.first_name || ' ' || NEW.last_name;
    END IF;
    RETURN NEW;
END;
$$;

-- 1c. custom_access_token_hook (from migration 022)
-- IMPORTANT: CREATE OR REPLACE resets ACLs, so grants must be re-issued below.
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

  SELECT fm.role, fm.farm_id
  INTO v_role, v_farm_id
  FROM public.farm_members fm
  WHERE fm.user_id = v_user_id
  ORDER BY fm.created_at ASC
  LIMIT 1;

  claims := event->'claims';

  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  IF v_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{app_metadata, farm_id}', to_jsonb(v_farm_id::text));
  ELSE
    claims := jsonb_set(claims, '{app_metadata, user_role}', 'null');
    claims := jsonb_set(claims, '{app_metadata, farm_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Re-issue grants from migration 022 (CREATE OR REPLACE resets ACLs)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- 1d. set_farm_member_full_name (from migration 024)
CREATE OR REPLACE FUNCTION set_farm_member_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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
$$;

-- 1e. sync_farm_member_full_name (from migration 024)
CREATE OR REPLACE FUNCTION sync_farm_member_full_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.farm_members
  SET full_name = COALESCE(NEW.display_name, NEW.phone, 'Unknown')
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- 1f. cascade_well_farm_id_change (created manually, not in migrations)
CREATE OR REPLACE FUNCTION cascade_well_farm_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.farm_id IS DISTINCT FROM NEW.farm_id THEN
    UPDATE public.allocations SET farm_id = NEW.farm_id WHERE well_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. Enable RLS on spatial_ref_sys (PostGIS system table)
-- =============================================================================
-- spatial_ref_sys is a read-only reference table for coordinate systems.
-- Must be readable by ALL roles (including anon, service_role) because PostGIS
-- internal functions (ST_Transform, geography coercions) query this table under
-- the session's current role.

-- NOTE: spatial_ref_sys is owned by supabase_admin, not postgres.
-- This section must be run separately with the table owner's role.
-- In Supabase SQL Editor: switch Role dropdown to the owner shown by:
--   SELECT tableowner FROM pg_tables WHERE tablename = 'spatial_ref_sys';
-- Then run the following two statements:
--
--   ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS "spatial_ref_sys is publicly readable" ON public.spatial_ref_sys;
--   CREATE POLICY "spatial_ref_sys is publicly readable"
--     ON public.spatial_ref_sys FOR SELECT TO public USING (true);
--

-- =============================================================================
-- 3. Drop unused uuid-ossp extension
-- =============================================================================
-- All UUID generation uses built-in gen_random_uuid(), not uuid_generate_v4().
-- Removing clears the "Extension in Public" security warning.

DROP EXTENSION IF EXISTS "uuid-ossp";

-- =============================================================================
-- 4. Reload PostgREST schema cache
-- =============================================================================
NOTIFY pgrst, 'reload schema';
