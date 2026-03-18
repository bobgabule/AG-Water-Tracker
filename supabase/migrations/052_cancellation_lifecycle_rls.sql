-- =============================================================================
-- Migration 052: Cancellation lifecycle columns + read-only RLS enforcement
-- =============================================================================
-- Adds canceled_at and scheduled_delete_at columns to farms table.
-- Creates is_farm_read_only() helper function.
-- Modifies all INSERT/UPDATE/DELETE RLS policies on wells, readings,
-- allocations, and farms to block writes when farm is in read-only mode
-- (subscription canceled AND paid period ended).
--
-- SELECT policies remain UNCHANGED -- read-only mode allows all reads.
-- =============================================================================

-- =============================================================================
-- 1. Add new columns to farms table
-- =============================================================================

ALTER TABLE public.farms ADD COLUMN canceled_at TIMESTAMPTZ;
ALTER TABLE public.farms ADD COLUMN scheduled_delete_at TIMESTAMPTZ;

COMMENT ON COLUMN public.farms.canceled_at IS 'When the Stripe subscription was canceled (set by webhook on customer.subscription.deleted)';
COMMENT ON COLUMN public.farms.scheduled_delete_at IS 'When the farm data will be permanently deleted (current_period_end + 1 year, set by webhook)';

-- =============================================================================
-- 2. Create read-only helper function
-- =============================================================================
-- Returns TRUE if the farm subscription is canceled AND the paid period has
-- ended. Used by RLS policies to block writes in read-only mode.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_farm_read_only(p_farm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farms
    WHERE id = p_farm_id
      AND subscription_status = 'canceled'
      AND current_period_end < NOW()
  );
$$;

COMMENT ON FUNCTION public.is_farm_read_only IS 'Returns TRUE if farm subscription is canceled AND paid period has ended -- used by RLS to block writes';

-- =============================================================================
-- 3. Drop and recreate INSERT/UPDATE/DELETE policies on wells
-- =============================================================================
-- Current policy names (from migrations 018 and 032):
--   INSERT: "Members can create wells" (get_user_farm_ids)
--   UPDATE: "Members can update wells" (get_user_farm_ids)
--   DELETE: "Members can delete wells" (get_user_farm_ids)
-- =============================================================================

DROP POLICY IF EXISTS "Members can create wells" ON wells;
DROP POLICY IF EXISTS "Members can update wells" ON wells;
DROP POLICY IF EXISTS "Members can delete wells" ON wells;

CREATE POLICY "Members can create wells"
    ON wells FOR INSERT
    WITH CHECK (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

CREATE POLICY "Members can update wells"
    ON wells FOR UPDATE
    USING (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

CREATE POLICY "Members can delete wells"
    ON wells FOR DELETE
    USING (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

-- =============================================================================
-- 4. Drop and recreate INSERT/UPDATE/DELETE policies on readings
-- =============================================================================
-- Current policy names (from migration 031):
--   INSERT: "Members can create readings" (farm_id IN get_user_farm_ids)
--   UPDATE: "Grower and admin can update readings" (farm_id IN get_user_admin_farm_ids)
--   DELETE: "Grower and admin can delete readings" (farm_id IN get_user_admin_farm_ids)
-- Readings have denormalized farm_id column.
-- =============================================================================

DROP POLICY IF EXISTS "Members can create readings" ON readings;
DROP POLICY IF EXISTS "Grower and admin can update readings" ON readings;
DROP POLICY IF EXISTS "Grower and admin can delete readings" ON readings;

CREATE POLICY "Members can create readings"
    ON readings FOR INSERT
    WITH CHECK (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

CREATE POLICY "Grower and admin can update readings"
    ON readings FOR UPDATE
    USING (
      farm_id IN (SELECT get_user_admin_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

CREATE POLICY "Grower and admin can delete readings"
    ON readings FOR DELETE
    USING (
      farm_id IN (SELECT get_user_admin_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

-- =============================================================================
-- 5. Drop and recreate INSERT/UPDATE/DELETE policies on allocations
-- =============================================================================
-- Current policy names (from migration 031):
--   INSERT: "Members can create allocations" (farm_id IN get_user_farm_ids)
--   UPDATE: "Members can update allocations" (farm_id IN get_user_farm_ids)
--   DELETE: "Members can delete allocations" (farm_id IN get_user_farm_ids)
-- Allocations have denormalized farm_id column.
-- =============================================================================

DROP POLICY IF EXISTS "Members can create allocations" ON allocations;
DROP POLICY IF EXISTS "Members can update allocations" ON allocations;
DROP POLICY IF EXISTS "Members can delete allocations" ON allocations;

CREATE POLICY "Members can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

CREATE POLICY "Members can update allocations"
    ON allocations FOR UPDATE
    USING (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

CREATE POLICY "Members can delete allocations"
    ON allocations FOR DELETE
    USING (
      farm_id IN (SELECT get_user_farm_ids())
      AND NOT is_farm_read_only(farm_id)
    );

-- =============================================================================
-- 6. Drop and recreate farms UPDATE policy with read-only check
-- =============================================================================
-- Current policy name (from migration 011):
--   UPDATE: "Owners and admins can update their farms" (get_user_admin_farm_ids)
-- =============================================================================

DROP POLICY IF EXISTS "Owners and admins can update their farms" ON farms;

CREATE POLICY "Owners and admins can update their farms"
    ON farms FOR UPDATE
    USING (
      id IN (SELECT get_user_admin_farm_ids())
      AND NOT is_farm_read_only(id)
    );

-- =============================================================================
-- 7. Grant execute permission and reload schema
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.is_farm_read_only(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_farm_read_only(UUID) TO anon;

NOTIFY pgrst, 'reload schema';
