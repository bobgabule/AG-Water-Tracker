-- =============================================================================
-- Migration 046: Exclude super_admin from monthly report recipients
-- =============================================================================
-- Only owner and admin emails should be auto-added to reports.
-- Super_admin is an internal role and should not receive farm reports.
-- =============================================================================

-- Update RPC to exclude super_admin
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
    AND fm.role IN ('owner', 'admin')
    AND u.email IS NOT NULL
    AND u.email != ''
  ORDER BY fm.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_farm_admin_emails(UUID) TO authenticated;

-- Remove any already-auto-added super_admin entries from report recipients
DELETE FROM public.report_email_recipients
WHERE is_auto_added = TRUE
  AND source_user_id IN (
    SELECT user_id FROM public.farm_members WHERE role = 'super_admin'
  );

NOTIFY pgrst, 'reload schema';
