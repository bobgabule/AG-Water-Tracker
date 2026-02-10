-- =============================================================================
-- Migration 018: Allow all farm members to create wells
-- =============================================================================
-- Updates the wells INSERT policy to allow any farm member (not just owners/admins)
-- to create wells. This enables field workers to add wells from the mobile app.
-- =============================================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Owners and admins can create wells" ON wells;

-- Create new policy allowing all farm members to create wells
CREATE POLICY "Members can create wells"
    ON wells FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_farm_ids()));

-- Add comment for documentation
COMMENT ON POLICY "Members can create wells" ON wells IS 'All farm members can create wells for their farms';
