-- =============================================================================
-- Migration 013: Drop wells, allocations, and readings tables
-- =============================================================================
-- These tables are being removed until the wells feature is finalized.
-- They will be recreated with the correct schema when ready.
-- =============================================================================

-- Drop triggers first (if they exist)
DROP TRIGGER IF EXISTS update_wells_updated_at ON wells;
DROP TRIGGER IF EXISTS update_allocations_updated_at ON allocations;
DROP TRIGGER IF EXISTS update_readings_updated_at ON readings;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view farm wells" ON wells;
DROP POLICY IF EXISTS "Admins can create wells" ON wells;
DROP POLICY IF EXISTS "Admins can update wells" ON wells;
DROP POLICY IF EXISTS "Admins can delete wells" ON wells;
DROP POLICY IF EXISTS "Members can view farm wells" ON wells;
DROP POLICY IF EXISTS "Owners and admins can create wells" ON wells;
DROP POLICY IF EXISTS "Owners and admins can update wells" ON wells;
DROP POLICY IF EXISTS "Owners and admins can delete wells" ON wells;

DROP POLICY IF EXISTS "Users can view farm allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can create allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can update allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can delete allocations" ON allocations;
DROP POLICY IF EXISTS "Members can view farm allocations" ON allocations;
DROP POLICY IF EXISTS "Owners and admins can create allocations" ON allocations;
DROP POLICY IF EXISTS "Owners and admins can update allocations" ON allocations;
DROP POLICY IF EXISTS "Owners and admins can delete allocations" ON allocations;

DROP POLICY IF EXISTS "Users can view farm readings" ON readings;
DROP POLICY IF EXISTS "Users can create readings" ON readings;
DROP POLICY IF EXISTS "Users can update own readings" ON readings;
DROP POLICY IF EXISTS "Admins can delete readings" ON readings;
DROP POLICY IF EXISTS "Members can view farm readings" ON readings;
DROP POLICY IF EXISTS "Members can create readings" ON readings;
DROP POLICY IF EXISTS "Members can update own readings" ON readings;
DROP POLICY IF EXISTS "Owners and admins can delete readings" ON readings;

-- Drop tables (readings depends on wells, allocations depends on wells)
DROP TABLE IF EXISTS readings CASCADE;
DROP TABLE IF EXISTS allocations CASCADE;
DROP TABLE IF EXISTS wells CASCADE;
