-- Primus GFS Framework Database Schema
-- 
-- This migration creates the tables needed for the Primus GFS compliance framework.
-- Run this on your AWS RDS PostgreSQL database to set up the schema.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: org_framework
-- ============================================================================
-- Tracks which compliance frameworks an organization has enabled.
-- One org can enable multiple frameworks (though currently only Primus GFS).

CREATE TABLE IF NOT EXISTS org_framework (
    org_id UUID NOT NULL,
    framework_id TEXT NOT NULL,
    enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (org_id, framework_id)
);

CREATE INDEX IF NOT EXISTS idx_org_framework_org_id ON org_framework(org_id);
CREATE INDEX IF NOT EXISTS idx_org_framework_framework_id ON org_framework(framework_id);

COMMENT ON TABLE org_framework IS 'Tracks which compliance frameworks each organization has enabled';
COMMENT ON COLUMN org_framework.org_id IS 'Organization UUID';
COMMENT ON COLUMN org_framework.framework_id IS 'Framework identifier (e.g., primus_gfs)';
COMMENT ON COLUMN org_framework.enabled_at IS 'When the framework was enabled';

-- ============================================================================
-- Table: org_module
-- ============================================================================
-- Tracks which modules within a framework an organization has selected.
-- One row per module selection. No arrays, clean relational design.

CREATE TABLE IF NOT EXISTS org_module (
    org_id UUID NOT NULL,
    framework_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (org_id, framework_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_org_module_org_id ON org_module(org_id);
CREATE INDEX IF NOT EXISTS idx_org_module_framework_id ON org_module(framework_id);
CREATE INDEX IF NOT EXISTS idx_org_module_org_framework ON org_module(org_id, framework_id);

COMMENT ON TABLE org_module IS 'Tracks which modules within a framework each organization has selected';
COMMENT ON COLUMN org_module.org_id IS 'Organization UUID';
COMMENT ON COLUMN org_module.framework_id IS 'Framework identifier (e.g., primus_gfs)';
COMMENT ON COLUMN org_module.module_id IS 'Module identifier (e.g., 1, 2, 3)';
COMMENT ON COLUMN org_module.enabled_at IS 'When the module was enabled';

-- ============================================================================
-- Table: document
-- ============================================================================
-- Stores document metadata and status for compliance documents.
-- Each document belongs to a specific sub-module or sub-sub-module.
-- Actual document content is stored in S3, referenced by content_key.
--
-- Design notes:
-- - id: UUID primary key for API responses and references
-- - Composite unique constraint ensures one document per sub-module
-- - created_by/updated_by: Track user actions for audit trail
-- - deleted_at: Soft delete support (NULL = active, timestamp = deleted)
-- - status: draft (being edited), ready (published), archived (superseded)

CREATE TABLE IF NOT EXISTS document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL,
    framework_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    sub_module_id TEXT NOT NULL,
    sub_sub_module_id TEXT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    content_key TEXT NOT NULL,
    current_version INTEGER NOT NULL DEFAULT 1,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    -- Ensure only one active document per sub-module
    UNIQUE (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_document_org_id ON document(org_id);
CREATE INDEX IF NOT EXISTS idx_document_org_framework ON document(org_id, framework_id);
CREATE INDEX IF NOT EXISTS idx_document_status ON document(status);
CREATE INDEX IF NOT EXISTS idx_document_module ON document(org_id, framework_id, module_id);

-- Optimized index for active documents (most common query)
CREATE INDEX IF NOT EXISTS idx_document_active ON document(org_id, framework_id, module_id) 
    WHERE deleted_at IS NULL;

-- Index for audit queries (who created/updated)
CREATE INDEX IF NOT EXISTS idx_document_created_by ON document(created_by);
CREATE INDEX IF NOT EXISTS idx_document_updated_by ON document(updated_by);

-- Comments for documentation
COMMENT ON TABLE document IS 'Stores document metadata and status for compliance documents';
COMMENT ON COLUMN document.id IS 'UUID primary key for document identification';
COMMENT ON COLUMN document.org_id IS 'Organization UUID';
COMMENT ON COLUMN document.framework_id IS 'Framework identifier (e.g., primus_gfs)';
COMMENT ON COLUMN document.module_id IS 'Module identifier (e.g., 1, 2, 3)';
COMMENT ON COLUMN document.sub_module_id IS 'Sub-module identifier (e.g., 1.01, 2.03)';
COMMENT ON COLUMN document.sub_sub_module_id IS 'Sub-sub-module identifier if applicable (e.g., 4.04.01)';
COMMENT ON COLUMN document.title IS 'Document title';
COMMENT ON COLUMN document.status IS 'Document status: draft, ready, or archived';
COMMENT ON COLUMN document.content_key IS 'S3 key for document content';
COMMENT ON COLUMN document.current_version IS 'Current version number of the document';
COMMENT ON COLUMN document.created_by IS 'UUID of user who created the document';
COMMENT ON COLUMN document.updated_by IS 'UUID of user who last updated the document';
COMMENT ON COLUMN document.deleted_at IS 'Soft delete timestamp (NULL = active)';

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================
-- Uncomment to insert sample data for testing

/*
-- Sample organization
INSERT INTO org_framework (org_id, framework_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'primus_gfs')
ON CONFLICT DO NOTHING;

-- Sample modules
INSERT INTO org_module (org_id, framework_id, module_id)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'primus_gfs', '1'),
    ('00000000-0000-0000-0000-000000000001', 'primus_gfs', '2'),
    ('00000000-0000-0000-0000-000000000001', 'primus_gfs', '5')
ON CONFLICT DO NOTHING;

-- Sample document
INSERT INTO document (id, org_id, framework_id, module_id, sub_module_id, sub_sub_module_id, title, status, content_key, current_version, created_by)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'primus_gfs',
    '1',
    '1.01',
    NULL,
    'Management System Procedures',
    'draft',
    'docs/00000000-0000-0000-0000-000000000001/primus_gfs/1/1.01/v1.md',
    1,
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;
*/
