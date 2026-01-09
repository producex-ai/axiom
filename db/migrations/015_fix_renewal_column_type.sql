-- Migration 015: Fix renewal column type
-- NOTE: This migration has been merged into Migration 014 for fresh schema installations.
-- This file is kept for backward compatibility with existing databases that ran Migration 014 before the fix.

-- Changes renewal from TIMESTAMPTZ to TEXT to store period values like 'quarterly', 'semi_annually', etc.

-- Drop existing indexes that reference the renewal column
DROP INDEX IF EXISTS idx_document_renewal;
DROP INDEX IF EXISTS idx_document_renewal_due;

-- Alter the column type from TIMESTAMPTZ to TEXT
ALTER TABLE document ALTER COLUMN renewal TYPE TEXT USING renewal::TEXT;

-- Recreate indexes with the correct type
CREATE INDEX IF NOT EXISTS idx_document_renewal ON document(renewal) 
    WHERE renewal IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_renewal_due ON document(org_id, renewal) 
    WHERE renewal IS NOT NULL AND deleted_at IS NULL;
