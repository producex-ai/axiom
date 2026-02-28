-- Fix compliance_artifact_links.created_by column type
-- Change from UUID to TEXT to support Clerk user IDs
-- Date: 2026-02-28
--
-- ISSUE: Clerk user IDs are strings like 'user_xxx', not UUIDs
-- This migration safely converts the column type from UUID to TEXT

BEGIN;

-- ============================================================================
-- Alter created_by column type from UUID to TEXT
-- ============================================================================
-- This is safe because:
-- 1. The column is nullable
-- 2. The feature is new, so likely no/few existing records
-- 3. If there are UUID values, they will be cast to TEXT automatically

ALTER TABLE compliance_artifact_links
    ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Update column comment to reflect the new type
COMMENT ON COLUMN compliance_artifact_links.created_by IS 'Clerk user ID of user who created the link';

COMMIT;

-- ============================================================================
-- Verification Query (Run separately to verify)
-- ============================================================================
-- Verify the column type has been changed
-- SELECT 
--     column_name,
--     data_type,
--     is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'compliance_artifact_links'
--     AND column_name = 'created_by';

