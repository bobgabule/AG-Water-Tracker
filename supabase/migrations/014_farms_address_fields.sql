-- Migration: Add address fields to farms table
-- These fields store the business/legal address for the farm

ALTER TABLE farms
ADD COLUMN street_address TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT;

-- Add comment for documentation
COMMENT ON COLUMN farms.street_address IS 'Business street address';
COMMENT ON COLUMN farms.city IS 'Business city';
COMMENT ON COLUMN farms.state IS 'US state abbreviation (e.g., TX, CA)';
COMMENT ON COLUMN farms.zip_code IS 'ZIP code';
