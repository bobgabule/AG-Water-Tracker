-- =============================================================================
-- Migration 057: Fix missing ON DELETE CASCADE on farm FK constraints
-- =============================================================================
-- The delete-expired-farms cron job deletes the farm row and relies on
-- FK CASCADE to clean up related data. Three tables had NO ACTION instead
-- of CASCADE on their farm_id FK, causing the deletion to fail.
--
-- Fix: Drop and recreate the FK constraints with ON DELETE CASCADE.
-- =============================================================================

-- 1. readings.farm_id → farms.id
ALTER TABLE public.readings
  DROP CONSTRAINT readings_farm_id_fkey,
  ADD CONSTRAINT readings_farm_id_fkey
    FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;

-- 2. allocations.farm_id → farms.id
ALTER TABLE public.allocations
  DROP CONSTRAINT allocations_farm_id_fkey,
  ADD CONSTRAINT allocations_farm_id_fkey
    FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;

-- 3. stripe_subscriptions.farm_id → farms.id
ALTER TABLE public.stripe_subscriptions
  DROP CONSTRAINT stripe_subscriptions_farm_id_fkey,
  ADD CONSTRAINT stripe_subscriptions_farm_id_fkey
    FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;
