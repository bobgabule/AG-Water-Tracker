-- =============================================================================
-- Migration 041: Add is_similar_reading flag to readings
-- =============================================================================
-- Persists whether a reading was flagged as similar to the prior reading
-- (within 50-gallon threshold). Set to 1 when user clicks "Continue" past
-- the similar-reading warning in the app.
-- =============================================================================

ALTER TABLE public.readings
  ADD COLUMN is_similar_reading INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.readings.is_similar_reading
  IS '0/1 boolean — true when reading was within 50-gallon threshold of prior reading and user confirmed';
