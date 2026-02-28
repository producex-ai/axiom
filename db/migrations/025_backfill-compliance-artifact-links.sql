-- Migration: Backfill compliance_artifact_links
-- Purpose: Link existing artifacts to ComplianceDocs based on sub_module_id
-- Safe to run multiple times (idempotent)
-- Date: 2026-02-28
--
-- SCHEMA NOTES:
-- - job_templates: Has org_id and sop field (sop = sub_module_id reference)
-- - log_templates: Has org_id and sop field (sop = sub_module_id reference)
-- - document: Has org_id, sub_module_id, doc_type
--   - Compliance docs: doc_type IS NULL or doc_type != 'company'
--   - Company docs: doc_type = 'company'
--
-- STRATEGY:
-- - Link JobTemplates where sop = sub_module_id (auto-suggested based on sop field)
-- - Link LogTemplates where sop = sub_module_id (auto-suggested based on sop field)
-- - CompanyDocuments: MANUAL ONLY (users curate specific relationships)
--
-- Post-Deployment: Run this after rollback-company-doc-links.sql has been executed

BEGIN;

-- ============================================================================
-- Link JobTemplates to ComplianceDocs (sop = sub_module_id)
-- ============================================================================

INSERT INTO compliance_artifact_links (
    id,
    compliance_doc_id,
    artifact_type,
    artifact_id,
    created_at,
    created_by
)
SELECT 
    gen_random_uuid() AS id,
    d.id AS compliance_doc_id,
    'job_template'::artifact_type AS artifact_type,
    jt.id AS artifact_id,
    NOW() AS created_at,
    NULL AS created_by
FROM job_templates jt
INNER JOIN document d ON jt.sop = d.sub_module_id
    AND jt.org_id = d.org_id
WHERE 
    -- Only active job templates
    jt.active = TRUE
    -- Only link to compliance documents (not company documents)
    AND d.doc_type IS DISTINCT FROM 'company'
    AND d.deleted_at IS NULL
    -- Both have valid identifiers
    AND d.sub_module_id IS NOT NULL
    AND jt.sop IS NOT NULL
    AND jt.sop != ''
    -- Prevent duplicates
    AND NOT EXISTS (
        SELECT 1 
        FROM compliance_artifact_links cal
        WHERE cal.compliance_doc_id = d.id
            AND cal.artifact_type = 'job_template'
            AND cal.artifact_id = jt.id
    )
ON CONFLICT (compliance_doc_id, artifact_type, artifact_id) DO NOTHING;

-- ============================================================================
-- Link LogTemplates to ComplianceDocs (sop = sub_module_id)
-- ============================================================================

INSERT INTO compliance_artifact_links (
    id,
    compliance_doc_id,
    artifact_type,
    artifact_id,
    created_at,
    created_by
)
SELECT 
    gen_random_uuid() AS id,
    d.id AS compliance_doc_id,
    'log_template'::artifact_type AS artifact_type,
    lt.id AS artifact_id,
    NOW() AS created_at,
    NULL AS created_by
FROM log_templates lt
INNER JOIN document d ON lt.sop = d.sub_module_id
    AND lt.org_id = d.org_id
WHERE 
    -- Only link to compliance documents (not company documents)
    d.doc_type IS DISTINCT FROM 'company'
    AND d.deleted_at IS NULL
    -- Both have valid identifiers
    AND d.sub_module_id IS NOT NULL
    AND lt.sop IS NOT NULL
    AND lt.sop != ''
    -- Prevent duplicates
    AND NOT EXISTS (
        SELECT 1 
        FROM compliance_artifact_links cal
        WHERE cal.compliance_doc_id = d.id
            AND cal.artifact_type = 'log_template'
            AND cal.artifact_id = lt.id
    )
ON CONFLICT (compliance_doc_id, artifact_type, artifact_id) DO NOTHING;

-- ============================================================================
-- Summary Report
-- ============================================================================

DO $$
DECLARE
    job_template_count INTEGER;
    log_template_count INTEGER;
    total_docs_with_links INTEGER;
BEGIN
    -- Count links created by type
    SELECT COUNT(*) INTO job_template_count 
    FROM compliance_artifact_links 
    WHERE artifact_type = 'job_template';
    
    SELECT COUNT(*) INTO log_template_count 
    FROM compliance_artifact_links 
    WHERE artifact_type = 'log_template';
    
    -- Count compliance docs with at least one link
    SELECT COUNT(DISTINCT compliance_doc_id) INTO total_docs_with_links
    FROM compliance_artifact_links;
    
    RAISE NOTICE '✅ Backfill completed successfully';
    RAISE NOTICE '📊 Job Template Links: %', job_template_count;
    RAISE NOTICE '📊 Log Template Links: %', log_template_count;
    RAISE NOTICE '📄 Compliance Docs with Links: %', total_docs_with_links;
    RAISE NOTICE '💡 Company Documents: Manual linking only (via UI)';
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries (Run separately to verify results)
-- ============================================================================

-- Count of links created per artifact type
-- SELECT 
--     artifact_type,
--     COUNT(*) as link_count
-- FROM compliance_artifact_links
-- GROUP BY artifact_type
-- ORDER BY artifact_type;

-- Count of compliance docs with at least one linked artifact
-- SELECT COUNT(DISTINCT compliance_doc_id) as docs_with_links
-- FROM compliance_artifact_links;

-- Detailed breakdown per compliance doc
-- SELECT 
--     cd.title as compliance_doc_title,
--     cd.sub_module_id,
--     COUNT(DISTINCT CASE WHEN cal.artifact_type = 'job_template' THEN cal.artifact_id END) as job_templates,
--     COUNT(DISTINCT CASE WHEN cal.artifact_type = 'log_template' THEN cal.artifact_id END) as log_templates,
--     COUNT(DISTINCT CASE WHEN cal.artifact_type = 'company_document' THEN cal.artifact_id END) as company_documents,
--     COUNT(cal.id) as total_links
-- FROM document cd
-- LEFT JOIN compliance_artifact_links cal 
--     ON cd.id = cal.compliance_doc_id
-- WHERE cd.doc_type IS DISTINCT FROM 'company' 
--     AND cd.deleted_at IS NULL
-- GROUP BY cd.id, cd.title, cd.sub_module_id
-- HAVING COUNT(cal.id) > 0
-- ORDER BY total_links DESC;

-- Verify job templates linked via sop field
-- SELECT 
--     jt.name as job_template_name,
--     jt.sop as sub_module_id,
--     COUNT(cal.id) as linked_to_docs
-- FROM job_templates jt
-- LEFT JOIN compliance_artifact_links cal 
--     ON cal.artifact_id = jt.id 
--     AND cal.artifact_type = 'job_template'
-- WHERE jt.active = TRUE
-- GROUP BY jt.id, jt.name, jt.sop
-- ORDER BY linked_to_docs DESC;

-- Verify log templates linked via sop field
-- SELECT 
--     lt.name as log_template_name,
--     lt.sop as sub_module_id,
--     COUNT(cal.id) as linked_to_docs
-- FROM log_templates lt
-- LEFT JOIN compliance_artifact_links cal 
--     ON cal.artifact_id = lt.id 
--     AND cal.artifact_type = 'log_template'
-- GROUP BY lt.id, lt.name, lt.sop
-- ORDER BY linked_to_docs DESC;
