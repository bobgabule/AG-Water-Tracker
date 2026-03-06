-- Migration 050: Add extra_wells column to farms table
-- Supports per-farm add-on wells beyond the base tier limit

ALTER TABLE public.farms ADD COLUMN extra_wells INTEGER NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
