-- Migration 004: Change status from 'ready' to 'published'
-- This migration updates the status constraint and existing data

-- Drop the old constraint first
ALTER TABLE document DROP CONSTRAINT IF EXISTS document_status_check;

-- Update existing records with 'ready' status to 'published'
UPDATE document 
SET status = 'published' 
WHERE status = 'ready';

-- Add new constraint with 'published' instead of 'ready'
ALTER TABLE document ADD CONSTRAINT document_status_check 
  CHECK (status IN ('draft', 'published', 'archived'));

-- Update column comment
COMMENT ON COLUMN document.status IS 'Document status: draft, published, or archived';
