-- Migration 014: Add document metadata fields
-- Adds optional metadata fields for document lifecycle management
-- These fields support tracking publication, renewal scheduling, and document classification
-- Merged with Migration 015: renewal column is TEXT type for storing period values like 'quarterly', 'semi_annually', etc.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: document (extend existing table)
-- ============================================================================
-- Add new optional columns to the existing document table.
-- Safe migration: uses IF NOT EXISTS checks and defaults to NULL for backward compatibility.

-- Add optional metadata fields
ALTER TABLE document ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;
ALTER TABLE document ADD COLUMN IF NOT EXISTS renewal TEXT NULL;  -- TEXT type for storing renewal periods
ALTER TABLE document ADD COLUMN IF NOT EXISTS doc_type TEXT NULL;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_document_published_at ON document(published_at DESC) 
    WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_renewal ON document(renewal) 
    WHERE renewal IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_doc_type ON document(doc_type) 
    WHERE doc_type IS NOT NULL;

-- Optimized index for finding documents needing renewal
CREATE INDEX IF NOT EXISTS idx_document_renewal_due ON document(org_id, renewal) 
    WHERE renewal IS NOT NULL AND deleted_at IS NULL;

-- Comments for documentation
COMMENT ON COLUMN document.published_at IS 'Timestamp when document was published (NULL = not yet published)';
COMMENT ON COLUMN document.renewal IS 'Renewal period for document reviews (quarterly, semi_annually, annually, 2_years)';
COMMENT ON COLUMN document.doc_type IS 'Document type classification (e.g., policy, procedure, form, company, etc.)';
