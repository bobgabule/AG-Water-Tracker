-- =============================================================================
-- Migration 031: Create readings and allocations tables
-- =============================================================================
-- Creates the v2.0 data foundation: readings (meter readings) and allocations
-- (water usage allocations) tables with RLS policies, indexes, and triggers.
--
-- Both tables include a denormalized farm_id column auto-populated from
-- wells.farm_id via BEFORE INSERT triggers. This enables direct PowerSync
-- sync rule filtering (WHERE farm_id = bucket.farm_id) without subqueries.
--
-- Note: Old readings/allocations tables were dropped in migration 013.
-- Old RLS policies from migration 011 were also dropped via CASCADE.
-- This migration creates fresh tables with the v2.0 schema.
-- =============================================================================

-- =============================================================================
-- Readings table
-- =============================================================================

CREATE TABLE readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES farms(id),
    value NUMERIC(15,2) NOT NULL,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gps_latitude NUMERIC(10,8),
    gps_longitude NUMERIC(11,8),
    is_in_range BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE readings IS 'Meter readings recorded by field agents at wells';
COMMENT ON COLUMN readings.value IS 'Raw cumulative meter value (exact decimal)';
COMMENT ON COLUMN readings.farm_id IS 'Denormalized from wells.farm_id for PowerSync sync rule filtering';
COMMENT ON COLUMN readings.is_in_range IS 'Whether GPS position was within proximity range of the well at recording time';

-- =============================================================================
-- Readings indexes
-- =============================================================================

CREATE INDEX idx_readings_well_id ON readings(well_id);
CREATE INDEX idx_readings_farm_id ON readings(farm_id);
CREATE INDEX idx_readings_well_recorded_at ON readings(well_id, recorded_at DESC);

-- =============================================================================
-- Readings updated_at trigger (reuses function from migration 001)
-- =============================================================================

CREATE TRIGGER update_readings_updated_at
    BEFORE UPDATE ON readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Trigger: Auto-populate farm_id on readings INSERT
-- =============================================================================
-- Looks up farm_id from public.wells and sets it on the new row.
-- Uses fully qualified public.wells reference (required when called from
-- SECURITY DEFINER functions with restricted search_path).
-- =============================================================================

CREATE OR REPLACE FUNCTION set_reading_farm_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.farm_id := (SELECT farm_id FROM public.wells WHERE id = NEW.well_id);
    IF NEW.farm_id IS NULL THEN
        RAISE EXCEPTION 'Well % not found or has no farm_id', NEW.well_id;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_reading_farm_id IS 'Auto-populates readings.farm_id from wells.farm_id on INSERT';

CREATE TRIGGER trg_set_reading_farm_id
    BEFORE INSERT ON readings
    FOR EACH ROW
    EXECUTE FUNCTION set_reading_farm_id();

-- =============================================================================
-- Allocations table
-- =============================================================================

CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES farms(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    allocated_af NUMERIC(10,2) NOT NULL CHECK (allocated_af > 0),
    used_af NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT allocations_period_valid CHECK (period_end > period_start)
);

COMMENT ON TABLE allocations IS 'Water usage allocations for wells over defined periods';
COMMENT ON COLUMN allocations.farm_id IS 'Denormalized from wells.farm_id for PowerSync sync rule filtering';
COMMENT ON COLUMN allocations.allocated_af IS 'Allocated water amount in acre-feet';
COMMENT ON COLUMN allocations.used_af IS 'Used water amount in acre-feet (auto-calculated from readings or manually overridden)';
COMMENT ON COLUMN allocations.is_manual_override IS 'Whether used_af was manually set rather than auto-calculated';

-- =============================================================================
-- Allocations indexes
-- =============================================================================

CREATE INDEX idx_allocations_well_id ON allocations(well_id);
CREATE INDEX idx_allocations_farm_id ON allocations(farm_id);
CREATE INDEX idx_allocations_period ON allocations(well_id, period_start, period_end);

-- =============================================================================
-- Allocations updated_at trigger (reuses function from migration 001)
-- =============================================================================

CREATE TRIGGER update_allocations_updated_at
    BEFORE UPDATE ON allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Trigger: Auto-populate farm_id on allocations INSERT
-- =============================================================================
-- Same pattern as readings: looks up farm_id from public.wells.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_allocation_farm_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.farm_id := (SELECT farm_id FROM public.wells WHERE id = NEW.well_id);
    IF NEW.farm_id IS NULL THEN
        RAISE EXCEPTION 'Well % not found or has no farm_id', NEW.well_id;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_allocation_farm_id IS 'Auto-populates allocations.farm_id from wells.farm_id on INSERT';

CREATE TRIGGER trg_set_allocation_farm_id
    BEFORE INSERT ON allocations
    FOR EACH ROW
    EXECUTE FUNCTION set_allocation_farm_id();

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================

ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies for readings (4 policies)
-- =============================================================================
-- SELECT/INSERT: All farm members (via get_user_farm_ids)
-- UPDATE/DELETE: Grower/admin only (via get_user_admin_farm_ids) per v2.0 decision READ-05/READ-06
-- =============================================================================

CREATE POLICY "Members can view farm readings"
    ON readings FOR SELECT
    USING (farm_id IN (SELECT get_user_farm_ids()));

CREATE POLICY "Members can create readings"
    ON readings FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_farm_ids()));

CREATE POLICY "Grower and admin can update readings"
    ON readings FOR UPDATE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

CREATE POLICY "Grower and admin can delete readings"
    ON readings FOR DELETE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- =============================================================================
-- RLS Policies for allocations (4 policies)
-- =============================================================================
-- All operations: Any farm member (via get_user_farm_ids)
-- Per v2.0 decision: anyone with well access can set allocations
-- =============================================================================

CREATE POLICY "Members can view farm allocations"
    ON allocations FOR SELECT
    USING (farm_id IN (SELECT get_user_farm_ids()));

CREATE POLICY "Members can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_farm_ids()));

CREATE POLICY "Members can update allocations"
    ON allocations FOR UPDATE
    USING (farm_id IN (SELECT get_user_farm_ids()));

CREATE POLICY "Members can delete allocations"
    ON allocations FOR DELETE
    USING (farm_id IN (SELECT get_user_farm_ids()));
