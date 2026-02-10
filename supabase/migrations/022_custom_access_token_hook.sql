-- =============================================================================
-- Migration 022: Custom Access Token Hook
-- =============================================================================
--
-- What: Creates a PostgreSQL function that Supabase Auth calls on every token
--       issuance (login, refresh) to inject the user's role and farm_id into
--       the JWT's app_metadata claims.
--
-- Why in public schema: Supabase Auth Hooks require the target function to
--       exist in the public schema. Unlike our other privileged functions
--       (which live in the private schema), this one MUST be public.
--
-- Claims path:
--   - app_metadata.user_role  (text: 'super_admin' | 'grower' | 'admin' | 'meter_checker' | null)
--   - app_metadata.farm_id    (text: UUID string | null)
--
-- Manual setup required:
--   After applying this migration, you must enable the hook in the Supabase
--   Dashboard:
--     1. Go to Authentication -> Hooks -> Custom Access Token
--     2. Select "custom_access_token_hook" from the function dropdown
--     3. Enable and save
--
-- Token refresh cadence:
--   Tokens are refreshed approximately every hour. Role changes will NOT be
--   reflected in the JWT until the next token refresh. If immediate role
--   updates are needed, the user must log out and log back in.
--
-- Behavior:
--   - If the user has farm membership(s), injects the role and farm_id from
--     their PRIMARY farm (earliest created_at).
--   - If the user has NO farm membership (e.g., during onboarding), injects
--     null for both claims. This is expected behavior, not an error.
-- =============================================================================

-- Section 1: The hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_user_id uuid;
  v_role text;
  v_farm_id uuid;
BEGIN
  v_user_id := (event->>'user_id')::uuid;

  -- Get user's primary farm membership (first farm joined)
  SELECT fm.role, fm.farm_id
  INTO v_role, v_farm_id
  FROM public.farm_members fm
  WHERE fm.user_id = v_user_id
  ORDER BY fm.created_at ASC
  LIMIT 1;

  claims := event->'claims';

  -- Ensure app_metadata exists in claims
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject role and farm_id into app_metadata
  IF v_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(v_role));
    claims := jsonb_set(claims, '{app_metadata, farm_id}', to_jsonb(v_farm_id::text));
  ELSE
    -- User has no farm membership yet (e.g., during onboarding)
    claims := jsonb_set(claims, '{app_metadata, user_role}', 'null');
    claims := jsonb_set(claims, '{app_metadata, farm_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;


-- Section 2: Permission grants

-- Grant schema access to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Allow auth admin to execute the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Prevent direct invocation by regular users (security: they should NOT be able to call this)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Allow the hook to read farm_members (supabase_auth_admin needs SELECT)
GRANT SELECT ON TABLE public.farm_members TO supabase_auth_admin;


-- Section 3: RLS policy for supabase_auth_admin

-- supabase_auth_admin needs to bypass RLS on farm_members to look up the user's role
CREATE POLICY "Allow auth admin to read farm_members"
    ON farm_members AS PERMISSIVE FOR SELECT
    TO supabase_auth_admin USING (true);
