-- =============================================================================
-- Migration 045: RPC to fetch owner/admin emails for a farm
-- =============================================================================
-- Returns emails of owners, admins, and super_admins for a given farm.
-- Used by the Reports page to auto-list admin emails.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_farm_admin_emails(p_farm_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, role TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT fm.user_id, u.email, fm.role
  FROM public.farm_members fm
  JOIN public.users u ON u.id = fm.user_id
  WHERE fm.farm_id = p_farm_id
    AND fm.role IN ('owner', 'admin', 'super_admin')
    AND u.email IS NOT NULL
    AND u.email != ''
  ORDER BY fm.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_farm_admin_emails(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
