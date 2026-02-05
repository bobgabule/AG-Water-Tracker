-- =============================================================================
-- Migration 009: Update users table (remove farm_id, role)
-- =============================================================================
-- This migration removes the farm_id and role columns from the users table.
-- These columns are being replaced by the farm_members junction table.
-- This is a fresh start migration - no data migration is needed.
-- =============================================================================

-- Drop indexes that depend on farm_id and role columns
DROP INDEX IF EXISTS idx_users_farm_id;
DROP INDEX IF EXISTS idx_users_farm_role;

-- Drop the get_my_farm_id function that was used for RLS (from migration 006)
-- This function queries users.farm_id which will no longer exist
DROP FUNCTION IF EXISTS public.get_my_farm_id();

-- Drop RLS policies that depend on farm_id column before dropping the column
DROP POLICY IF EXISTS "Users can view farm members" ON users;

-- Drop the farm_id and role columns if they exist
-- Using DO block to handle cases where columns might not exist
DO $$
BEGIN
    -- Drop farm_id column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'farm_id'
    ) THEN
        ALTER TABLE users DROP COLUMN farm_id;
        RAISE NOTICE 'Dropped farm_id column from users table';
    ELSE
        RAISE NOTICE 'farm_id column does not exist in users table';
    END IF;

    -- Drop role column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'role'
    ) THEN
        ALTER TABLE users DROP COLUMN role;
        RAISE NOTICE 'Dropped role column from users table';
    ELSE
        RAISE NOTICE 'role column does not exist in users table';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User profiles extending auth.users. Farm membership is now handled by farm_members table.';

-- =============================================================================
-- Remaining columns in users table after this migration:
-- - id UUID (PK, references auth.users)
-- - phone TEXT
-- - first_name TEXT
-- - last_name TEXT
-- - email TEXT
-- - display_name TEXT
-- - created_at TIMESTAMPTZ
-- - updated_at TIMESTAMPTZ
-- =============================================================================
