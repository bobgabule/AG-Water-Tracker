-- =============================================================================
-- Migration 025: Auto-add super_admin users to all farms
-- =============================================================================
-- Ensures super_admin users have a farm_members row in every farm, so that
-- PowerSync sync rules (which key on farm_members) automatically sync all
-- farm data to super_admin clients.
--
-- Three triggers:
--   1. AFTER INSERT on farms: adds all existing super_admins to the new farm
--   2. AFTER UPDATE OF role on farm_members: when promoted to super_admin,
--      adds them to all existing farms they're not already a member of
--   3. AFTER INSERT on farm_members: when inserted with role = 'super_admin',
--      adds them to all other farms (covers backfill and manual inserts)
--
-- Also backfills: any existing super_admin users get rows for all existing farms.
--
-- The full_name column is handled automatically by the existing
-- trigger_set_farm_member_full_name (migration 012, fixed in 024).
-- =============================================================================

-- =============================================================================
-- 1. Trigger function: Add all super_admins to a newly created farm
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_super_admins_to_new_farm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.farm_members (farm_id, user_id, role)
  SELECT NEW.id, fm.user_id, 'super_admin'
  FROM public.farm_members fm
  WHERE fm.role = 'super_admin'
  GROUP BY fm.user_id
  ON CONFLICT (farm_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_super_admins_to_new_farm ON public.farms;
CREATE TRIGGER trigger_add_super_admins_to_new_farm
  AFTER INSERT ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.add_super_admins_to_new_farm();

-- =============================================================================
-- 2. Trigger function: Add newly promoted super_admin to all existing farms
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_super_admin_to_all_farms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND (OLD.role IS DISTINCT FROM 'super_admin') THEN
    INSERT INTO public.farm_members (farm_id, user_id, role)
    SELECT f.id, NEW.user_id, 'super_admin'
    FROM public.farms f
    WHERE NOT EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = f.id AND fm.user_id = NEW.user_id
    )
    ON CONFLICT (farm_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_super_admin_to_all_farms ON public.farm_members;
CREATE TRIGGER trigger_add_super_admin_to_all_farms
  AFTER UPDATE OF role ON public.farm_members
  FOR EACH ROW
  EXECUTE FUNCTION public.add_super_admin_to_all_farms();

-- =============================================================================
-- 3. Trigger function: Handle INSERT with role = 'super_admin' directly
-- =============================================================================
-- Covers: backfill, manual SQL, or future RPCs that create a super_admin
-- membership. Uses pg_trigger_depth() to prevent recursive trigger firings
-- when this trigger's own INSERTs fire the trigger again.

CREATE OR REPLACE FUNCTION public.add_super_admin_to_all_farms_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND pg_trigger_depth() <= 1 THEN
    INSERT INTO public.farm_members (farm_id, user_id, role)
    SELECT f.id, NEW.user_id, 'super_admin'
    FROM public.farms f
    WHERE f.id != NEW.farm_id
    AND NOT EXISTS (
      SELECT 1 FROM public.farm_members fm
      WHERE fm.farm_id = f.id AND fm.user_id = NEW.user_id
    )
    ON CONFLICT (farm_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_super_admin_to_all_farms_on_insert ON public.farm_members;
CREATE TRIGGER trigger_add_super_admin_to_all_farms_on_insert
  AFTER INSERT ON public.farm_members
  FOR EACH ROW
  EXECUTE FUNCTION public.add_super_admin_to_all_farms_on_insert();

-- =============================================================================
-- 4. Backfill: Add existing super_admins to all existing farms
-- =============================================================================

INSERT INTO public.farm_members (farm_id, user_id, role)
SELECT f.id, sa.user_id, 'super_admin'
FROM public.farms f
CROSS JOIN (
  SELECT DISTINCT user_id
  FROM public.farm_members
  WHERE role = 'super_admin'
) sa
WHERE NOT EXISTS (
  SELECT 1 FROM public.farm_members fm
  WHERE fm.farm_id = f.id AND fm.user_id = sa.user_id
)
ON CONFLICT (farm_id, user_id) DO NOTHING;
