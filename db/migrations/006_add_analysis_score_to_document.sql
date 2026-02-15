-- Add analysis_score column to document table
-- This stores the complete compliance analysis result including:
-- - overall_score: Overall compliance percentage
-- - coverage_score: How well document covers requirements
-- - audit_score: Audit readiness score
-- - risks: Array of identified issues
-- - requirements_coverage: Detailed breakdown of each requirement

ALTER TABLE document 
ADD COLUMN IF NOT EXISTS analysis_score JSONB;

-- Add index for queries filtering by scores
CREATE INDEX IF NOT EXISTS idx_document_analysis_score ON document USING gin(analysis_score);

-- Add comment for documentation
COMMENT ON COLUMN document.analysis_score IS 'Complete compliance analysis result stored as JSONB. Updated on document creation and each publish action.';
