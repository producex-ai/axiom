-- Migration: Add org_id column to job_templates and jobs tables
-- Purpose: Separate organization identifier from user identifier for better audit trails
-- Date: 2026-02-15

-- Add org_id column to job_templates table
-- Using a temporary default value; this needs to be backfilled with actual orgId data
ALTER TABLE job_templates 
  ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT 'NEEDS_BACKFILL';

-- Add index for org_id on job_templates
CREATE INDEX IF NOT EXISTS idx_job_templates_org_id ON job_templates(org_id);

-- Add org_id column to jobs table
-- Using a temporary default value; this needs to be backfilled with actual orgId data
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS org_id TEXT NOT NULL DEFAULT 'NEEDS_BACKFILL';

-- Add index for org_id on jobs
CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);

-- Note: After running this migration, you need to backfill the org_id column
-- with actual organization IDs by mapping existing created_by (userId) values
-- to their corresponding orgId values from Clerk.
-- 
-- Example backfill query (adjust based on your user->org mapping):
-- UPDATE job_templates SET org_id = (SELECT org_id FROM user_org_mapping WHERE user_id = job_templates.created_by);
-- UPDATE jobs SET org_id = (SELECT org_id FROM user_org_mapping WHERE user_id = jobs.created_by);

COMMENT ON COLUMN job_templates.org_id IS 'Organization ID for tenant isolation';
COMMENT ON COLUMN job_templates.created_by IS 'User ID of the user who created this template';
COMMENT ON COLUMN jobs.org_id IS 'Organization ID for tenant isolation';
COMMENT ON COLUMN jobs.created_by IS 'User ID of the user who created this job';
