-- =============================================================================
-- Migration 011: Configure RLS policies for new auth model
-- =============================================================================
-- This migration sets up Row Level Security policies for the new auth model
-- using farm_members for access control instead of the old users.farm_id column.
-- =============================================================================

-- =============================================================================
-- Enable RLS on new tables
-- =============================================================================

ALTER TABLE farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_invites ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper function: Get farms where user is owner or admin
-- =============================================================================
-- Used by RLS policies to check if user has admin access to a farm.
-- SECURITY DEFINER to bypass RLS during the check itself.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_admin_farm_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT farm_id
    FROM farm_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
$$;

COMMENT ON FUNCTION get_user_admin_farm_ids IS 'Returns farm IDs where the current user is owner or admin';

-- =============================================================================
-- Helper function: Get all farms user is a member of
-- =============================================================================
-- Used by RLS policies to check farm membership.
-- SECURITY DEFINER to bypass RLS during the check itself.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_farm_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT farm_id
    FROM farm_members
    WHERE user_id = auth.uid()
$$;

COMMENT ON FUNCTION get_user_farm_ids IS 'Returns all farm IDs where the current user is a member';

-- =============================================================================
-- farm_members RLS policies
-- =============================================================================
-- SELECT: Users can read their own membership records
-- INSERT/UPDATE/DELETE: Handled by SECURITY DEFINER RPCs
-- =============================================================================

-- Users can see their own farm memberships
CREATE POLICY "Users can view own farm memberships"
    ON farm_members FOR SELECT
    USING (user_id = auth.uid());

-- Users can also see other members of farms they belong to
CREATE POLICY "Users can view farm co-members"
    ON farm_members FOR SELECT
    USING (farm_id IN (SELECT get_user_farm_ids()));

-- Note: INSERT, UPDATE, DELETE are intentionally not granted via RLS.
-- These operations are handled by the SECURITY DEFINER functions:
-- - create_farm_and_membership()
-- - join_farm_with_code()
-- This prevents users from directly manipulating membership records.

-- =============================================================================
-- farm_invites RLS policies
-- =============================================================================
-- SELECT: Owners and admins can view invites for their farms
-- INSERT/UPDATE/DELETE: Handled by SECURITY DEFINER RPCs
-- =============================================================================

-- Owners and admins can view invites for their farms
CREATE POLICY "Owners and admins can view farm invites"
    ON farm_invites FOR SELECT
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Note: INSERT, UPDATE, DELETE are intentionally not granted via RLS.
-- These operations are handled by the create_invite_code() function.

-- =============================================================================
-- Update farms RLS policies
-- =============================================================================
-- Replace old policies that used users.farm_id with new farm_members-based policies
-- =============================================================================

-- Drop old policies that used users.farm_id
DROP POLICY IF EXISTS "Users can view their farm" ON farms;
DROP POLICY IF EXISTS "Admins can update their farm" ON farms;

-- Users can view farms they are members of
CREATE POLICY "Members can view their farms"
    ON farms FOR SELECT
    USING (id IN (SELECT get_user_farm_ids()));

-- Owners and admins can update their farms
CREATE POLICY "Owners and admins can update their farms"
    ON farms FOR UPDATE
    USING (id IN (SELECT get_user_admin_farm_ids()));

-- Note: Farm creation is handled by create_farm_and_membership() RPC
-- The existing "Authenticated users can create farms" policy from migration 002
-- can remain for backward compatibility, but the RPC is the preferred method.

-- =============================================================================
-- Update wells RLS policies
-- =============================================================================
-- Replace old policies that used users.farm_id with new farm_members-based policies
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view farm wells" ON wells;
DROP POLICY IF EXISTS "Admins can create wells" ON wells;
DROP POLICY IF EXISTS "Admins can update wells" ON wells;
DROP POLICY IF EXISTS "Admins can delete wells" ON wells;

-- Members can view wells in their farms
CREATE POLICY "Members can view farm wells"
    ON wells FOR SELECT
    USING (farm_id IN (SELECT get_user_farm_ids()));

-- Owners and admins can create wells
CREATE POLICY "Owners and admins can create wells"
    ON wells FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Owners and admins can update wells
CREATE POLICY "Owners and admins can update wells"
    ON wells FOR UPDATE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Owners and admins can delete wells
CREATE POLICY "Owners and admins can delete wells"
    ON wells FOR DELETE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- =============================================================================
-- Update allocations RLS policies
-- =============================================================================
-- Replace old policies that used users.farm_id with new farm_members-based policies
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view farm allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can create allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can update allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can delete allocations" ON allocations;

-- Members can view allocations for wells in their farms
CREATE POLICY "Members can view farm allocations"
    ON allocations FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
        )
    );

-- Owners and admins can manage allocations
CREATE POLICY "Owners and admins can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
        )
    );

CREATE POLICY "Owners and admins can update allocations"
    ON allocations FOR UPDATE
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
        )
    );

CREATE POLICY "Owners and admins can delete allocations"
    ON allocations FOR DELETE
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
        )
    );

-- =============================================================================
-- Update readings RLS policies
-- =============================================================================
-- Replace old policies that used users.farm_id with new farm_members-based policies
-- =============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view farm readings" ON readings;
DROP POLICY IF EXISTS "Farm members can create readings" ON readings;
DROP POLICY IF EXISTS "Creator or admin can update readings" ON readings;
DROP POLICY IF EXISTS "Creator or admin can delete readings" ON readings;

-- Members can view readings for wells in their farms
CREATE POLICY "Members can view farm readings"
    ON readings FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
        )
    );

-- All farm members can create readings
CREATE POLICY "Members can create readings"
    ON readings FOR INSERT
    WITH CHECK (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
        )
    );

-- Creator or owner/admin can update readings
CREATE POLICY "Creator or owner/admin can update readings"
    ON readings FOR UPDATE
    USING (
        created_by = auth.uid()
        OR well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
        )
    );

-- Creator or owner/admin can delete readings
CREATE POLICY "Creator or owner/admin can delete readings"
    ON readings FOR DELETE
    USING (
        created_by = auth.uid()
        OR well_id IN (
            SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
        )
    );

-- =============================================================================
-- users table RLS policies
-- =============================================================================
-- The users table should allow users to read/update their own profile.
-- Viewing other users' profiles is allowed if they share a farm membership.
-- =============================================================================

-- Keep existing "Users can view own record" policy from migration 002/005
-- DROP POLICY IF EXISTS "Users can view own record" ON users; -- Already exists

-- Drop the recursive policy if it still exists (was dropped in migration 006)
-- This is a safety measure in case migrations were applied out of order
DROP POLICY IF EXISTS "Users can view farm members" ON users;

-- Users can view profiles of other members in their farms
CREATE POLICY "Users can view farm member profiles"
    ON users FOR SELECT
    USING (
        id = auth.uid()  -- Can always see own profile
        OR id IN (
            -- Can see profiles of users who share a farm with them
            SELECT fm.user_id
            FROM farm_members fm
            WHERE fm.farm_id IN (SELECT get_user_farm_ids())
        )
    );

-- Keep existing "Users can create own record" and "Users can update own record" policies
-- These are defined in migration 002 and should remain unchanged
