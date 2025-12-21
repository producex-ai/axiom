-- Evidence Upload & Compliance Analysis Schema
-- 
-- This migration creates tables for the evidence upload and compliance analysis flow.
-- Design: Single unified "document" table for all documents (existing + generated from evidence).
-- 
-- Tables:
-- - uploaded_evidence: Temporary storage for evidence files during analysis
-- - compliance_analysis: LLM analysis results for audit trail
-- - document_source: Links documents to their evidence/analysis origin
-- - Existing "document" table: Final DOCX becomes a document record

-- ============================================================================
-- Table: uploaded_evidence
-- ============================================================================
-- Stores metadata about uploaded evidence files for compliance analysis.
-- Links to submodules and tracks file locations in S3.
-- Temporary - can be soft-deleted after analysis is complete.

CREATE TABLE IF NOT EXISTS uploaded_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    sub_module_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_key TEXT NOT NULL,                  -- S3 path to original file
    extracted_text_key TEXT NOT NULL,         -- S3 path to extracted text
    file_size INTEGER NOT NULL,               -- Size in bytes
    file_type TEXT NOT NULL,                  -- 'docx' or 'pdf'
    uploaded_by UUID NOT NULL,                -- User ID who uploaded
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,                   -- Soft delete timestamp
    
    CONSTRAINT check_file_type CHECK (file_type IN ('docx', 'pdf')),
    CONSTRAINT check_file_size CHECK (file_size > 0 AND file_size <= 10485760)  -- Max 10MB
);

CREATE INDEX IF NOT EXISTS idx_uploaded_evidence_org_id ON uploaded_evidence(org_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_evidence_submodule ON uploaded_evidence(org_id, sub_module_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_evidence_uploaded_by ON uploaded_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_evidence_uploaded_at ON uploaded_evidence(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_evidence_deleted ON uploaded_evidence(deleted_at);

COMMENT ON TABLE uploaded_evidence IS 'Temporary metadata for uploaded evidence documents used in compliance analysis. Can be deleted after analysis.';
COMMENT ON COLUMN uploaded_evidence.id IS 'Unique evidence file ID';
COMMENT ON COLUMN uploaded_evidence.org_id IS 'Organization UUID';
COMMENT ON COLUMN uploaded_evidence.sub_module_id IS 'Sub-module identifier (e.g., 1.01, 5.12, 4.04.01)';
COMMENT ON COLUMN uploaded_evidence.file_key IS 'S3 path to original uploaded file';
COMMENT ON COLUMN uploaded_evidence.extracted_text_key IS 'S3 path to extracted text file';
COMMENT ON COLUMN uploaded_evidence.file_type IS 'File type: docx or pdf';
COMMENT ON COLUMN uploaded_evidence.deleted_at IS 'Timestamp when soft-deleted (NULL if active)';

-- ============================================================================
-- Table: compliance_analysis
-- ============================================================================
-- Stores LLM analysis results for compliance evaluation.
-- One analysis per set of evidence documents for a submodule.
-- Kept separate for audit trail and history tracking.

CREATE TABLE IF NOT EXISTS compliance_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    sub_module_id TEXT NOT NULL,
    evidence_ids JSONB NOT NULL,              -- Array of evidence IDs used in analysis
    overall_score INTEGER NOT NULL,           -- Compliance score 0-100
    analysis_result JSONB NOT NULL,           -- Full analysis results (covered, partial, missing, risks, coverageMap)
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_score CHECK (overall_score >= 0 AND overall_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_compliance_analysis_org_id ON compliance_analysis(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_submodule ON compliance_analysis(org_id, sub_module_id);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_created_by ON compliance_analysis(created_by);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_created_at ON compliance_analysis(created_at DESC);

COMMENT ON TABLE compliance_analysis IS 'LLM analysis results for evidence documents against compliance checklist. For audit trail and history.';
COMMENT ON COLUMN compliance_analysis.id IS 'Unique analysis ID';
COMMENT ON COLUMN compliance_analysis.org_id IS 'Organization UUID';
COMMENT ON COLUMN compliance_analysis.sub_module_id IS 'Sub-module analyzed';
COMMENT ON COLUMN compliance_analysis.evidence_ids IS 'JSON array of evidence file IDs used in this analysis';
COMMENT ON COLUMN compliance_analysis.overall_score IS 'Overall compliance percentage (0-100)';
COMMENT ON COLUMN compliance_analysis.analysis_result IS 'Full analysis JSON: {covered, partial, missing, risks, coverageMap}';

-- ============================================================================
-- Table: document_source
-- ============================================================================
-- Links documents (in "document" table) to their evidence/analysis origin.
-- Tracks how a document was generated: from evidence upload, merge, or improve.
-- Provides audit trail for document provenance.

CREATE TABLE IF NOT EXISTS document_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES compliance_analysis(id) ON DELETE SET NULL,
    evidence_ids JSONB NOT NULL,              -- Array of evidence IDs used
    generation_type TEXT NOT NULL,            -- 'merged' or 'improved'
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Track which analysis produced this document (if any)
    UNIQUE (document_id),
    CONSTRAINT check_generation_type CHECK (generation_type IN ('merged', 'improved'))
);

CREATE INDEX IF NOT EXISTS idx_document_source_document_id ON document_source(document_id);
CREATE INDEX IF NOT EXISTS idx_document_source_analysis_id ON document_source(analysis_id);
CREATE INDEX IF NOT EXISTS idx_document_source_created_by ON document_source(created_by);
CREATE INDEX IF NOT EXISTS idx_document_source_created_at ON document_source(created_at DESC);

COMMENT ON TABLE document_source IS 'Tracks origin of documents generated from evidence analysis. Links to compliance_analysis and uploaded_evidence.';
COMMENT ON COLUMN document_source.id IS 'Unique record ID';
COMMENT ON COLUMN document_source.document_id IS 'Reference to document in "document" table';
COMMENT ON COLUMN document_source.analysis_id IS 'Reference to compliance_analysis (NULL if document was manually created)';
COMMENT ON COLUMN document_source.evidence_ids IS 'JSON array of evidence IDs used to generate this document';
COMMENT ON COLUMN document_source.generation_type IS 'How document was generated: merged (consolidation only) or improved (AI-generated sections)';
COMMENT ON COLUMN document_source.created_by IS 'User UUID who initiated generation';

-- ============================================================================
-- UNIFIED FLOW SUMMARY
-- ============================================================================
-- 
-- Evidence Upload Flow:
--   1. User uploads 1-3 DOCX/PDF files → uploaded_evidence table
--   2. System extracts text, stores in S3
--   3. User runs LLM analysis → compliance_analysis table (audit trail)
--   4. User chooses: Merge (no AI) or Improve (with AI)
--   5. Generated DOCX is ATTACHED to document table (single source of truth)
--   6. document_source links document to its evidence/analysis origin
--
-- Result:
--   ✓ One unified "document" table - all documents (manually created or generated)
--   ✓ Audit trail via document_source and compliance_analysis
--   ✓ Evidence cleanup - uploaded_evidence can be soft-deleted after attachment
--   ✓ No confusion - users always see documents in "document" table
--
-- Example Query:
--   SELECT d.*, ds.analysis_id, ds.generation_type, ds.evidence_ids
--   FROM document d
--   LEFT JOIN document_source ds ON d.id = ds.document_id
--   WHERE d.org_id = $1 AND d.sub_module_id = $2 AND d.deleted_at IS NULL;
-- ============================================================================

-- This migration adds 4 new tables:
-- 1. uploaded_evidence - Tracks uploaded evidence files
-- 2. compliance_analysis - Stores analysis results
-- 3. generated_document - Stores merged/improved documents
-- 4. submodule_state - Tracks final document per submodule
--
-- Plus 2 helper functions for common queries
--
-- Expected usage flow:
-- 1. Upload evidence files → uploaded_evidence records created
-- 2. Analyze evidence → compliance_analysis record created
-- 3. Generate merged/improved document → generated_document record created
-- 4. Attach to submodule → submodule_state updated with final_doc_id
