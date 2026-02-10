-- Migration: Add active column to job_templates
-- Date: 2026-02-06

-- Add active column with default TRUE
ALTER TABLE job_templates 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for active column
CREATE INDEX IF NOT EXISTS idx_job_templates_active ON job_templates(active);

-- Add comment
COMMENT ON COLUMN job_templates.active IS 'Soft delete flag - FALSE means template is archived';
