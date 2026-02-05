-- =============================================================================
-- Migration 012: Add full_name to farm_members for PowerSync
-- =============================================================================
-- This migration adds a denormalized full_name column to farm_members to enable
-- simple PowerSync sync rules that don't require subqueries.
--
-- The full_name is copied from users.display_name and kept in sync via triggers.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add full_name to farm_members table
-- ---------------------------------------------------------------------------

ALTER TABLE farm_members ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Backfill existing data from users.display_name
UPDATE farm_members fm
SET full_name = COALESCE(u.display_name, u.phone, 'Unknown')
FROM users u
WHERE fm.user_id = u.id AND fm.full_name IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Trigger to auto-populate full_name on farm_members INSERT
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_farm_member_full_name()
RETURNS TRIGGER
SECURITY INVOKER
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Lookup display_name from users, fallback to phone or 'Unknown'
  SELECT COALESCE(display_name, phone, 'Unknown') INTO user_name
  FROM users WHERE id = NEW.user_id;

  -- Only set if not explicitly provided
  IF NEW.full_name IS NULL THEN
    NEW.full_name := user_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_farm_member_full_name ON farm_members;
CREATE TRIGGER trigger_set_farm_member_full_name
BEFORE INSERT ON farm_members
FOR EACH ROW
EXECUTE FUNCTION set_farm_member_full_name();

-- ---------------------------------------------------------------------------
-- 3. Trigger to sync full_name when user updates their display_name or phone
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_farm_member_full_name()
RETURNS TRIGGER
SECURITY INVOKER
AS $$
BEGIN
  UPDATE farm_members
  SET full_name = COALESCE(NEW.display_name, NEW.phone, 'Unknown')
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_farm_member_name ON users;
CREATE TRIGGER trigger_sync_farm_member_name
AFTER UPDATE OF display_name, phone ON users
FOR EACH ROW
EXECUTE FUNCTION sync_farm_member_full_name();
