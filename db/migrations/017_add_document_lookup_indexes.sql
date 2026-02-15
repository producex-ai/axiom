-- Migration 017: Add optimized indexes for document lookup queries
-- Addresses intermittent timeout issues on document queries

-- ============================================================================
-- PROBLEM: Intermittent timeouts on simple document lookups
-- ============================================================================
-- Query: SELECT * FROM document WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
-- 
-- Existing indexes don't efficiently cover this common query pattern.
-- While there's an index on org_id and id is a primary key, PostgreSQL
-- may not optimally use these for the combined lookup with deleted_at filter.

-- ============================================================================
-- SOLUTION: Add composite and partial indexes for fast lookups
-- ============================================================================

-- Composite index on (id, org_id) for fast document identification
-- Since id is UUID and should be unique across orgs, this is a very selective index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_id_org_id 
    ON document(id, org_id);

-- Optimized partial index for active document lookups (most common case)
-- This covers the WHERE deleted_at IS NULL condition
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_id_org_active 
    ON document(id, org_id) 
    WHERE deleted_at IS NULL;

-- Additional composite index for document revision lookups
-- This helps queries that fetch documents and their revisions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_revision_doc_org 
    ON document_revision(document_id, org_id);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. CONCURRENTLY: Allows index creation without locking the table
-- 2. IF NOT EXISTS: Safe to re-run this migration
-- 3. The partial index (WHERE deleted_at IS NULL) is smaller and faster
--    than indexing all rows including soft-deleted ones
-- 4. These indexes will significantly speed up:
--    - getDocumentById()
--    - Document history fetches
--    - Document revision queries

-- ============================================================================
-- EXPECTED IMPACT
-- ============================================================================
-- Before: Simple lookups occasionally timeout at 10 seconds
-- After:  Lookups should complete in <100ms even under load

-- Query performance validation (run after migration):
-- EXPLAIN ANALYZE SELECT * FROM document 
--   WHERE id = 'some-uuid' AND org_id = 'some-org-id' AND deleted_at IS NULL;

COMMENT ON INDEX idx_document_id_org_id IS 'Fast composite lookup for document by ID and org';
COMMENT ON INDEX idx_document_id_org_active IS 'Optimized partial index for active document lookups';
COMMENT ON INDEX idx_document_revision_doc_org IS 'Composite index for document revision queries';
