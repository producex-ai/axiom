-- Compliance Artifact Links
-- 
-- This migration creates the table for linking compliance documents to operational artifacts.
-- Supports linking to job templates and company documents to establish traceability.
-- Date: 2026-02-28

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enum: artifact_type
-- ============================================================================
-- Defines the types of artifacts that can be linked to compliance documents

CREATE TYPE artifact_type AS ENUM (
    'job_template',
    'company_document',
    'log_template'
);

COMMENT ON TYPE artifact_type IS 'Types of artifacts that can be linked to compliance documents';

-- ============================================================================
-- Table: compliance_artifact_links
-- ============================================================================
-- Links compliance documents to operational artifacts (job templates, company documents)
-- Enables traceability between compliance requirements and their implementations

CREATE TABLE IF NOT EXISTS compliance_artifact_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compliance_doc_id UUID NOT NULL,
    artifact_type artifact_type NOT NULL,
    artifact_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    
    -- Foreign key constraint to document table (compliance docs)
    CONSTRAINT fk_compliance_doc 
        FOREIGN KEY (compliance_doc_id) 
        REFERENCES document(id) 
        ON DELETE CASCADE
);

-- ============================================================================
-- Constraints
-- ============================================================================
-- Prevent duplicate links between the same compliance doc and artifact

ALTER TABLE compliance_artifact_links
    ADD CONSTRAINT unique_artifact_link 
    UNIQUE (compliance_doc_id, artifact_type, artifact_id);

-- ============================================================================
-- Indexes
-- ============================================================================
-- Optimize queries for finding links by compliance document

CREATE INDEX IF NOT EXISTS idx_artifact_links_compliance_doc 
    ON compliance_artifact_links(compliance_doc_id);

-- Optimize queries for finding which compliance docs reference an artifact

CREATE INDEX IF NOT EXISTS idx_artifact_links_artifact 
    ON compliance_artifact_links(artifact_type, artifact_id);

-- Index for audit queries (who created links)

CREATE INDEX IF NOT EXISTS idx_artifact_links_created_by 
    ON compliance_artifact_links(created_by);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE compliance_artifact_links IS 'Links compliance documents to operational artifacts for traceability';
COMMENT ON COLUMN compliance_artifact_links.id IS 'UUID primary key for the link';
COMMENT ON COLUMN compliance_artifact_links.compliance_doc_id IS 'UUID of the compliance document (references document table)';
COMMENT ON COLUMN compliance_artifact_links.artifact_type IS 'Type of artifact being linked (job_template or company_document)';
COMMENT ON COLUMN compliance_artifact_links.artifact_id IS 'UUID of the artifact being linked';
COMMENT ON COLUMN compliance_artifact_links.created_at IS 'Timestamp when the link was created';
COMMENT ON COLUMN compliance_artifact_links.created_by IS 'UUID of user who created the link';
