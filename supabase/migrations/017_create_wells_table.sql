-- =============================================================================
-- Migration 017: Create wells table
-- =============================================================================
-- Recreates the wells table with the new schema for the well creation feature.
-- Uses simple lat/lng columns instead of PostGIS geography type.
-- =============================================================================

-- Create wells table
CREATE TABLE IF NOT EXISTS wells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    meter_serial_number TEXT,
    wmis_number TEXT,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    units TEXT NOT NULL DEFAULT 'AF' CHECK (units IN ('AF', 'GAL', 'CF')),
    multiplier TEXT NOT NULL DEFAULT '1' CHECK (multiplier IN ('0.01', '1', '10', '1000', 'MG')),
    send_monthly_report BOOLEAN NOT NULL DEFAULT true,
    battery_state TEXT NOT NULL DEFAULT 'Unknown',
    pump_state TEXT NOT NULL DEFAULT 'Unknown',
    meter_status TEXT NOT NULL DEFAULT 'Unknown',
    status TEXT NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE wells IS 'Wells associated with farms for water usage tracking';
COMMENT ON COLUMN wells.id IS 'Unique identifier for the well';
COMMENT ON COLUMN wells.farm_id IS 'Reference to the farm this well belongs to';
COMMENT ON COLUMN wells.name IS 'Display name of the well';
COMMENT ON COLUMN wells.meter_serial_number IS 'Serial number of the water meter';
COMMENT ON COLUMN wells.wmis_number IS 'Water Management Information System number';
COMMENT ON COLUMN wells.latitude IS 'GPS latitude coordinate (10 digits, 8 decimal places)';
COMMENT ON COLUMN wells.longitude IS 'GPS longitude coordinate (11 digits, 8 decimal places)';
COMMENT ON COLUMN wells.units IS 'Unit of measurement: AF (acre-feet), GAL (gallons), CF (cubic feet)';
COMMENT ON COLUMN wells.multiplier IS 'Meter reading multiplier: 0.01, 1, 10, 1000, or MG (million gallons)';
COMMENT ON COLUMN wells.send_monthly_report IS 'Whether to include this well in monthly reports';
COMMENT ON COLUMN wells.battery_state IS 'Current state of the meter battery';
COMMENT ON COLUMN wells.pump_state IS 'Current state of the pump';
COMMENT ON COLUMN wells.meter_status IS 'Current status of the meter';
COMMENT ON COLUMN wells.status IS 'Well status (active, inactive, etc.)';
COMMENT ON COLUMN wells.created_by IS 'User who created this well';
COMMENT ON COLUMN wells.created_at IS 'Timestamp when the well was created';
COMMENT ON COLUMN wells.updated_at IS 'Timestamp when the well was last updated';

-- =============================================================================
-- Indexes
-- =============================================================================

-- Index on farm_id for looking up all wells in a farm
CREATE INDEX idx_wells_farm_id ON wells(farm_id);

-- Index on status for filtering wells by status
CREATE INDEX idx_wells_status ON wells(status);

-- =============================================================================
-- Trigger for updated_at
-- =============================================================================
-- Uses existing update_updated_at_column() function from migration 001

CREATE TRIGGER update_wells_updated_at
    BEFORE UPDATE ON wells
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================

ALTER TABLE wells ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies
-- =============================================================================
-- Uses existing helper functions:
-- - get_user_farm_ids(): Returns all farm IDs where user is a member
-- - get_user_admin_farm_ids(): Returns farm IDs where user is owner or admin
-- =============================================================================

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
