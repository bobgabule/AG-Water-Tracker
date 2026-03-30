-- Add type column to readings table for meter replacement support
-- All existing readings auto-get type = 'reading' via DEFAULT. No data migration needed.
ALTER TABLE readings
  ADD COLUMN type TEXT NOT NULL DEFAULT 'reading'
  CHECK (type IN ('reading', 'meter_replacement'));
