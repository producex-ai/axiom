-- Migration: Add doc_num and sop columns to job_templates
-- Date: 2026-02-08
-- Description: Adds document number and SOP fields to job templates

ALTER TABLE job_templates 
ADD COLUMN IF NOT EXISTS doc_num TEXT,
ADD COLUMN IF NOT EXISTS sop TEXT;

-- Add comments for documentation
COMMENT ON COLUMN job_templates.doc_num IS 'Document number for the job template';
COMMENT ON COLUMN job_templates.sop IS 'Standard Operating Procedure module reference';

-- Create index on sop for filtering
CREATE INDEX IF NOT EXISTS idx_job_templates_sop ON job_templates(sop);
