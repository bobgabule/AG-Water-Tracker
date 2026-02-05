-- =============================================================================
-- Migration 007: Create farm_members table
-- =============================================================================
-- This migration creates a junction table for user-farm relationships,
-- supporting many-to-many relationships between users and farms.
-- This replaces the previous model where users had a single farm_id column.
-- =============================================================================

-- Create farm_members table for user-farm relationships
CREATE TABLE IF NOT EXISTS farm_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Each user can only have one membership per farm
    UNIQUE(farm_id, user_id)
);

-- Add comments for documentation
COMMENT ON TABLE farm_members IS 'Junction table linking users to farms with role-based access';
COMMENT ON COLUMN farm_members.id IS 'Unique identifier for the membership record';
COMMENT ON COLUMN farm_members.farm_id IS 'Reference to the farm';
COMMENT ON COLUMN farm_members.user_id IS 'Reference to the auth.users record';
COMMENT ON COLUMN farm_members.role IS 'User role within the farm: owner, admin, or member';
COMMENT ON COLUMN farm_members.created_at IS 'Timestamp when the membership was created';

-- Indexes for common queries
-- Index on user_id for looking up all farms a user belongs to
CREATE INDEX idx_farm_members_user_id ON farm_members(user_id);

-- Index on farm_id for looking up all members of a farm
CREATE INDEX idx_farm_members_farm_id ON farm_members(farm_id);

-- Composite index for role-based queries within a farm
CREATE INDEX idx_farm_members_farm_role ON farm_members(farm_id, role);
