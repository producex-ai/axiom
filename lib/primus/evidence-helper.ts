/**
 * Database helper functions for evidence and compliance analysis models
 *
 * Tables:
 * - uploaded_evidence: Temporary storage for uploaded files during analysis
 * - compliance_analysis: Stores compliance analysis results for audit trail
 * - document_source: Links documents to their evidence/analysis origin
 * - document: Main table - all documents (manually created or generated) end up here
 */

import { query } from "@/lib/db/postgres";

/**
 * Evidence file metadata (temporary)
 */
export interface UploadedEvidence {
  id: string;
  org_id: string;
  sub_module_id: string;
  filename: string;
  file_key: string;
  extracted_text_key: string;
  file_size: number;
  file_type: "docx" | "pdf";
  uploaded_by: string;
  uploaded_at: string;
  deleted_at: string | null;
}

/**
 * Compliance analysis result (audit trail)
 */
export interface ComplianceAnalysis {
  id: string;
  org_id: string;
  sub_module_id: string;
  evidence_ids: string[];
  overall_score: number;
  analysis_result: Record<string, any>;
  created_by: string;
  created_at: string;
}

/**
 * Document source - tracks origin of documents
 */
export interface DocumentSource {
  id: string;
  document_id: string;
  analysis_id: string | null;
  evidence_ids: string[];
  generation_type: "merged" | "improved";
  created_by: string;
  created_at: string;
}

/**
 * Get all evidence for a submodule
 */
export async function getEvidenceForSubModule(
  orgId: string,
  subModuleId: string,
): Promise<UploadedEvidence[]> {
  const result = await query(
    `SELECT * FROM uploaded_evidence 
     WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
     ORDER BY uploaded_at DESC`,
    [orgId, subModuleId],
  );

  return result.rows;
}

/**
 * Get evidence by ID
 */
export async function getEvidenceById(
  orgId: string,
  evidenceId: string,
): Promise<UploadedEvidence | null> {
  const result = await query(
    `SELECT * FROM uploaded_evidence 
     WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [evidenceId, orgId],
  );

  return result.rows[0] || null;
}

/**
 * Get compliance analyses for a submodule
 */
export async function getComplianceAnalyses(
  orgId: string,
  subModuleId: string,
  limit: number = 10,
): Promise<ComplianceAnalysis[]> {
  const result = await query(
    `SELECT * FROM compliance_analysis 
     WHERE org_id = $1 AND sub_module_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [orgId, subModuleId, limit],
  );

  return result.rows.map((row: any) => ({
    ...row,
    evidence_ids: JSON.parse(row.evidence_ids),
    analysis_result: JSON.parse(row.analysis_result),
  }));
}

/**
 * Get compliance analysis by ID
 */
export async function getComplianceAnalysisById(
  orgId: string,
  analysisId: string,
): Promise<ComplianceAnalysis | null> {
  const result = await query(
    `SELECT * FROM compliance_analysis 
     WHERE id = $1 AND org_id = $2`,
    [analysisId, orgId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    evidence_ids: JSON.parse(row.evidence_ids),
    analysis_result: JSON.parse(row.analysis_result),
  };
}

/**
 * Get document source by document ID
 */
export async function getDocumentSource(
  documentId: string,
): Promise<DocumentSource | null> {
  const result = await query(
    `SELECT * FROM document_source WHERE document_id = $1`,
    [documentId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    evidence_ids: JSON.parse(row.evidence_ids),
  };
}

/**
 * Get count of evidence files for a submodule
 */
export async function getEvidenceCount(
  orgId: string,
  subModuleId: string,
): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM uploaded_evidence 
     WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL`,
    [orgId, subModuleId],
  );

  return parseInt(result.rows[0].count, 10);
}

/**
 * Get latest analysis for a submodule
 */
export async function getLatestAnalysis(
  orgId: string,
  subModuleId: string,
): Promise<ComplianceAnalysis | null> {
  const result = await query(
    `SELECT * FROM compliance_analysis 
     WHERE org_id = $1 AND sub_module_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [orgId, subModuleId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    evidence_ids: JSON.parse(row.evidence_ids),
    analysis_result: JSON.parse(row.analysis_result),
  };
}

/**
 * Mark evidence files as deleted
 */
export async function deleteEvidence(
  orgId: string,
  evidenceId: string,
): Promise<void> {
  await query(
    `UPDATE uploaded_evidence 
     SET deleted_at = $1 
     WHERE id = $2 AND org_id = $3`,
    [new Date().toISOString(), evidenceId, orgId],
  );
}

/**
 * Clean up evidence files (soft delete) after attachment to document
 * Optional - evidence can be kept for audit trail
 */
export async function cleanupEvidenceAfterAttachment(
  orgId: string,
  evidenceIds: string[],
): Promise<void> {
  if (evidenceIds.length === 0) return;

  await query(
    `UPDATE uploaded_evidence 
     SET deleted_at = NOW() 
     WHERE id = ANY($1) AND org_id = $2 AND deleted_at IS NULL`,
    [evidenceIds, orgId],
  );
}
