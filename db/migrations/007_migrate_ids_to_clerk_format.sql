-- Migration: Change UUID columns to TEXT for Clerk compatibility
-- 
-- This migration updates all org_id and user_id columns from UUID to TEXT
-- to support Clerk's ID format (e.g., org_37LiK4KqZpdgiiwOAbDiFcDLuHy, user_2abc...)
--
-- Run this migration BEFORE switching to Clerk authentication

-- ============================================================================
-- Table: org_framework
-- ============================================================================
ALTER TABLE org_framework
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;

-- ============================================================================
-- Table: org_module
-- ============================================================================
ALTER TABLE org_module
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;

-- ============================================================================
-- Table: document
-- ============================================================================
ALTER TABLE document
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT,
    ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT,
    ALTER COLUMN updated_by TYPE TEXT USING updated_by::TEXT;

-- ============================================================================
-- Table: document_revision
-- ============================================================================
ALTER TABLE document_revision
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT,
    ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ============================================================================
-- Table: uploaded_evidence
-- ============================================================================
ALTER TABLE uploaded_evidence
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT,
    ALTER COLUMN uploaded_by TYPE TEXT USING uploaded_by::TEXT;

-- ============================================================================
-- Table: compliance_analysis
-- ============================================================================
ALTER TABLE compliance_analysis
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT,
    ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- ============================================================================
-- Table: document_source
-- ============================================================================
ALTER TABLE document_source
    ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- ============================================================================
-- Table: company_document (if exists)
-- ============================================================================
-- Check if table exists first
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'company_document') THEN
        EXECUTE 'ALTER TABLE company_document
            ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT,
            ALTER COLUMN uploaded_by TYPE TEXT USING uploaded_by::TEXT';
    END IF;
END $$;

-- ============================================================================
-- Update comments to reflect TEXT type instead of UUID
-- ============================================================================
COMMENT ON COLUMN org_framework.org_id IS 'Organization ID (Clerk format: org_...)';
COMMENT ON COLUMN org_module.org_id IS 'Organization ID (Clerk format: org_...)';
COMMENT ON COLUMN document.org_id IS 'Organization ID (Clerk format: org_...)';
COMMENT ON COLUMN document.created_by IS 'User ID who created document (Clerk format: user_...)';
COMMENT ON COLUMN document.updated_by IS 'User ID who updated document (Clerk format: user_...)';
COMMENT ON COLUMN document_revision.org_id IS 'Organization ID (Clerk format: org_...)';
COMMENT ON COLUMN document_revision.user_id IS 'User ID who created revision (Clerk format: user_...)';
COMMENT ON COLUMN uploaded_evidence.org_id IS 'Organization ID (Clerk format: org_...)';
COMMENT ON COLUMN uploaded_evidence.uploaded_by IS 'User ID who uploaded (Clerk format: user_...)';
COMMENT ON COLUMN compliance_analysis.org_id IS 'Organization ID (Clerk format: org_...)';
COMMENT ON COLUMN compliance_analysis.created_by IS 'User ID who created analysis (Clerk format: user_...)';

