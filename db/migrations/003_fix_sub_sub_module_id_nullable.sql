-- Migration 003: Fix sub_sub_module_id to allow NULL
-- This column must allow NULL because not all sub-modules have sub-sub-modules

-- Make sub_sub_module_id nullable
ALTER TABLE document ALTER COLUMN sub_sub_module_id DROP NOT NULL;

-- Verify the change
COMMENT ON COLUMN document.sub_sub_module_id IS 'Sub-sub-module identifier if applicable (e.g., 4.04.01) - NULL for regular sub-modules';
