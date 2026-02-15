-- Migration 003: Add document revision history table
-- Tracks all revisions of a document including who created it, edited it, and published it
-- Supports complete audit trail for compliance documents

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: document_revision
-- ============================================================================
-- Tracks all revisions/versions of a document for audit trail.
-- Each time a document is created, edited, or published, a new revision is recorded.
--
-- Design notes:
-- - id: UUID primary key for revision identification
-- - document_id: Foreign key to document table
-- - version: Version number (matches document.current_version)
-- - action: Type of action (created, edited, published, restored)
-- - content_key: S3 path to this specific revision's content
-- - status: Status at time of this revision (draft, published, archived)
-- - user_id: UUID of the user who performed the action
-- - created_at: When this revision was created
-- - notes: Optional notes about the revision (e.g., change summary)

CREATE TABLE IF NOT EXISTS document_revision (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    org_id UUID NOT NULL,
    version INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'edited', 'published', 'restored')),
    content_key TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    user_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one revision per document version
    UNIQUE (document_id, version),
    
    -- Constraint to link to documents table
    CONSTRAINT fk_document_revision_document
        FOREIGN KEY (document_id)
        REFERENCES document(id)
        ON DELETE CASCADE
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_document_revision_document_id ON document_revision(document_id);
CREATE INDEX IF NOT EXISTS idx_document_revision_org_id ON document_revision(org_id);
CREATE INDEX IF NOT EXISTS idx_document_revision_user_id ON document_revision(user_id);
CREATE INDEX IF NOT EXISTS idx_document_revision_action ON document_revision(action);
CREATE INDEX IF NOT EXISTS idx_document_revision_created_at ON document_revision(created_at DESC);

-- Optimized index for getting full history of a document
CREATE INDEX IF NOT EXISTS idx_document_revision_history ON document_revision(document_id, version DESC);

-- Comments for documentation
COMMENT ON TABLE document_revision IS 'Tracks all revisions/versions of documents for audit trail and compliance';
COMMENT ON COLUMN document_revision.id IS 'UUID primary key for revision identification';
COMMENT ON COLUMN document_revision.document_id IS 'Foreign key to document table';
COMMENT ON COLUMN document_revision.org_id IS 'Organization UUID (denormalized for query efficiency)';
COMMENT ON COLUMN document_revision.version IS 'Version number of this revision';
COMMENT ON COLUMN document_revision.action IS 'Action performed: created, edited, published, or restored';
COMMENT ON COLUMN document_revision.content_key IS 'S3 key for this specific revision content';
COMMENT ON COLUMN document_revision.status IS 'Document status at time of this revision';
COMMENT ON COLUMN document_revision.user_id IS 'UUID of user who performed the action';
COMMENT ON COLUMN document_revision.notes IS 'Optional notes about this revision';
