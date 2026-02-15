-- Migration 002: Add audit fields and update document table schema
-- This migration safely adds new columns to existing document table
-- Safe to run multiple times (uses IF NOT EXISTS checks)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add new columns to existing document table
ALTER TABLE document ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();
ALTER TABLE document ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE document ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE document ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Update status constraint to include 'archived'
ALTER TABLE document DROP CONSTRAINT IF EXISTS document_status_check;
ALTER TABLE document ADD CONSTRAINT document_status_check 
  CHECK (status IN ('draft', 'ready', 'archived'));

-- Make id the primary key (if no existing PK conflict)
-- First, drop the old composite PK
ALTER TABLE document DROP CONSTRAINT IF EXISTS document_pkey;

-- Add unique constraint on the old PK columns
ALTER TABLE document ADD CONSTRAINT document_unique_submodule 
  UNIQUE (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id);

-- Set id as primary key (populate UUIDs first if null)
UPDATE document SET id = uuid_generate_v4() WHERE id IS NULL;
ALTER TABLE document ALTER COLUMN id SET NOT NULL;
ALTER TABLE document ADD PRIMARY KEY (id);

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_document_active 
  ON document(org_id, framework_id, module_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_created_by ON document(created_by);
CREATE INDEX IF NOT EXISTS idx_document_updated_by ON document(updated_by);

-- Add comments for new columns
COMMENT ON COLUMN document.id IS 'UUID primary key for document identification';
COMMENT ON COLUMN document.created_by IS 'UUID of user who created the document';
COMMENT ON COLUMN document.updated_by IS 'UUID of user who last updated the document';
COMMENT ON COLUMN document.deleted_at IS 'Soft delete timestamp (NULL = active)';
