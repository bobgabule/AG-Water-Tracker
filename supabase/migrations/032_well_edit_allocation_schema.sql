-- =============================================================================
-- Migration 032: Well edit and allocation schema updates
-- =============================================================================
-- Two changes:
-- 1. Add starting_reading column to allocations table for usage calculation
-- 2. Relax wells UPDATE/DELETE RLS policies to allow any farm member
--    (previously restricted to owners and admins)
--
-- Per v2.0 decision: anyone with well access can edit and delete wells.
-- =============================================================================

-- =============================================================================
-- 1. Add starting_reading column to allocations
-- =============================================================================
-- Baseline meter reading value for calculating usage within an allocation period.
-- Type matches readings.value (NUMERIC(15,2)) from migration 031.
-- =============================================================================

ALTER TABLE allocations ADD COLUMN starting_reading NUMERIC(15,2);

COMMENT ON COLUMN allocations.starting_reading
    IS 'Baseline meter reading value for usage calculation within this allocation period';

-- =============================================================================
-- 2. Relax wells UPDATE and DELETE RLS policies
-- =============================================================================
-- Previously: Only owners and admins (get_user_admin_farm_ids)
-- Now: Any farm member (get_user_farm_ids)
-- This matches the pattern used for INSERT (migration 018) and allocations (migration 031).
-- =============================================================================

DROP POLICY IF EXISTS "Owners and admins can update wells" ON wells;
DROP POLICY IF EXISTS "Owners and admins can delete wells" ON wells;

CREATE POLICY "Members can update wells"
    ON wells FOR UPDATE
    USING (farm_id IN (SELECT get_user_farm_ids()));

CREATE POLICY "Members can delete wells"
    ON wells FOR DELETE
    USING (farm_id IN (SELECT get_user_farm_ids()));
