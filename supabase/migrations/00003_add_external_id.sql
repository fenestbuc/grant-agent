-- Add external_id column for deduplication from scraped grants
ALTER TABLE grants ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create unique index for external_id (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS grants_external_id_unique ON grants(external_id) WHERE external_id IS NOT NULL;

-- Update existing grants to have an external_id based on name and provider
UPDATE grants
SET external_id = LEFT(encode(sha256((LOWER(TRIM(name)) || '-' || LOWER(TRIM(provider)))::bytea), 'hex'), 12)
WHERE external_id IS NULL;
