-- =============================================================================
-- Migration 008: Create farm_invites table
-- =============================================================================
-- This migration creates a table for managing invite codes that allow users
-- to join farms. Supports expiration, usage limits, and role assignment.
-- =============================================================================

-- Create farm_invites table for invite code management
CREATE TABLE IF NOT EXISTS farm_invites (
    -- 6-character alphanumeric code as primary key
    code TEXT PRIMARY KEY,
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    -- Role to assign to users who use this invite (admin or member, not owner)
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    -- Expiration timestamp - invites cannot be used after this time
    expires_at TIMESTAMPTZ NOT NULL,
    -- Maximum number of times this invite can be used (NULL = unlimited)
    max_uses INTEGER,
    -- Current number of times this invite has been used
    uses_count INTEGER NOT NULL DEFAULT 0,
    -- User who created this invite (for audit purposes)
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Constraint to ensure max_uses is positive if set
    CONSTRAINT positive_max_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

-- Add comments for documentation
COMMENT ON TABLE farm_invites IS 'Invite codes for joining farms with role assignment';
COMMENT ON COLUMN farm_invites.code IS 'Unique 6-character alphanumeric invite code';
COMMENT ON COLUMN farm_invites.farm_id IS 'Reference to the farm this invite is for';
COMMENT ON COLUMN farm_invites.role IS 'Role to assign: admin or member (owners cannot be created via invite)';
COMMENT ON COLUMN farm_invites.expires_at IS 'Timestamp after which the invite is no longer valid';
COMMENT ON COLUMN farm_invites.max_uses IS 'Maximum number of uses allowed (NULL = unlimited)';
COMMENT ON COLUMN farm_invites.uses_count IS 'Number of times this invite has been used';
COMMENT ON COLUMN farm_invites.created_by IS 'User who created this invite';
COMMENT ON COLUMN farm_invites.created_at IS 'Timestamp when the invite was created';

-- Index for farm lookup (to find all invites for a farm)
CREATE INDEX idx_farm_invites_farm_id ON farm_invites(farm_id);

-- Index for finding valid (non-expired) invites
CREATE INDEX idx_farm_invites_expires_at ON farm_invites(expires_at);
