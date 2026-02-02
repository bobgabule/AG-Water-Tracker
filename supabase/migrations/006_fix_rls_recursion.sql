-- Fix infinite recursion in RLS policies on the users table.
-- The "Users can view farm members" policy queries the users table in its
-- own USING clause, which triggers RLS evaluation again, causing recursion.
-- Solution: use a SECURITY DEFINER function to bypass RLS for the self-lookup.

CREATE OR REPLACE FUNCTION public.get_my_farm_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT farm_id FROM public.users WHERE id = auth.uid()
$$;

-- Drop the recursive policy and recreate it using the helper function
DROP POLICY IF EXISTS "Users can view farm members" ON users;
CREATE POLICY "Users can view farm members"
    ON users FOR SELECT
    USING (farm_id = public.get_my_farm_id());
