/**
 * Primus Database Helper
 *
 * Database operations for Primus GFS framework tables.
 * Uses direct PostgreSQL connection via node-postgres (pg).
 *
 * Tables:
 * - org_framework: Tracks which frameworks an org has enabled
 * - org_module: Tracks which modules within a framework an org has enabled
 * - document: Stores document metadata and status
 */

import { query } from "@/lib/db/postgres";

/**
 * Framework enablement record
 */
export interface OrgFramework {
  org_id: string;
  framework_id: string;
  enabled_at: string;
}

/**
 * Module enablement record
 */
export interface OrgModule {
  org_id: string;
  framework_id: string;
  module_id: string;
  enabled_at: string;
}

/**
 * Document metadata record
 */
export interface Document {
  id: string;
  org_id: string;
  framework_id: string;
  module_id: string;
  sub_module_id: string;
  sub_sub_module_id: string | null;
  title: string;
  status: "draft" | "published" | "archived";
  content_key: string;
  current_version: number;
  analysis_score: any | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  published_at: string | null;
  renewal: string | null;
  doc_type: string | null;
}

/**
 * Document revision record
 */
export interface DocumentRevision {
  id: string;
  document_id: string;
  org_id: string;
  version: number;
  action: "created" | "edited" | "published" | "restored";
  content_key: string;
  status: "draft" | "published" | "archived";
  user_id: string;
  notes: string | null;
  created_at: string;
}

/**
 * Check if org has enabled Primus framework
 */
export async function isFrameworkEnabled(
  orgId: string,
  frameworkId: string,
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT org_id FROM org_framework WHERE org_id = $1 AND framework_id = $2 LIMIT 1`,
      [orgId, frameworkId],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking framework enablement:", error);
    return false;
  }
}

/**
 * Enable framework for an org
 * Creates a record in org_framework table indicating the org has activated this framework.
 */
export async function enableFramework(
  orgId: string,
  frameworkId: string,
): Promise<void> {
  try {
    await query(
      `INSERT INTO org_framework (org_id, framework_id, enabled_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (org_id, framework_id) 
       DO UPDATE SET enabled_at = $3`,
      [orgId, frameworkId, new Date().toISOString()],
    );
  } catch (error) {
    console.error("Error enabling framework:", error);
    throw new Error(
      `Failed to enable framework: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get all enabled modules for an org + framework
 * Returns list of module IDs that the org has selected.
 */
export async function getEnabledModules(
  orgId: string,
  frameworkId: string,
): Promise<string[]> {
  try {
    const result = await query<{ module_id: string }>(
      `SELECT module_id FROM org_module WHERE org_id = $1 AND framework_id = $2`,
      [orgId, frameworkId],
    );
    return result.rows.map((row: { module_id: string }) => row.module_id);
  } catch (error) {
    console.error("Error fetching enabled modules:", error);
    throw new Error(
      `Failed to fetch enabled modules: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Save selected modules for an org
 * Replaces existing module selections with new set.
 * This is called during onboarding or when user changes their module selection.
 */
export async function saveEnabledModules(
  orgId: string,
  frameworkId: string,
  moduleIds: string[],
): Promise<void> {
  try {
    // First, ensure framework is enabled
    await enableFramework(orgId, frameworkId);

    // Delete existing module records for this org + framework
    await query(
      `DELETE FROM org_module WHERE org_id = $1 AND framework_id = $2`,
      [orgId, frameworkId],
    );

    // Insert new module records
    if (moduleIds.length > 0) {
      const enabledAt = new Date().toISOString();
      const values = moduleIds
        .map((_, index) => {
          const base = index * 4;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
        .join(", ");

      const params = moduleIds.flatMap((moduleId) => [
        orgId,
        frameworkId,
        moduleId,
        enabledAt,
      ]);

      await query(
        `INSERT INTO org_module (org_id, framework_id, module_id, enabled_at) VALUES ${values}`,
        params,
      );
    }
  } catch (error) {
    console.error("Error saving modules:", error);
    throw new Error(
      `Failed to save modules: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get all documents for an org + framework
 * Returns document records with status and metadata.
 * Only returns active documents (deleted_at IS NULL).
 */
export async function getOrgDocuments(
  orgId: string,
  frameworkId: string,
): Promise<Document[]> {
  try {
    const result = await query<Document>(
      `SELECT * FROM document 
       WHERE org_id = $1 AND framework_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [orgId, frameworkId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw new Error(
      `Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get document for a specific sub-module
 * Only returns active documents (deleted_at IS NULL).
 */
export async function getDocumentBySubModule(
  orgId: string,
  frameworkId: string,
  moduleId: string,
  subModuleId: string,
  subSubModuleId?: string | null,
): Promise<Document | null> {
  try {
    let sql: string;
    let params: any[];

    if (subSubModuleId) {
      sql = `SELECT * FROM document 
             WHERE org_id = $1 AND framework_id = $2 
             AND module_id = $3 AND sub_module_id = $4 
             AND sub_sub_module_id = $5 
             AND deleted_at IS NULL
             LIMIT 1`;
      params = [orgId, frameworkId, moduleId, subModuleId, subSubModuleId];
    } else {
      sql = `SELECT * FROM document 
             WHERE org_id = $1 AND framework_id = $2 
             AND module_id = $3 AND sub_module_id = $4 
             AND sub_sub_module_id IS NULL 
             AND deleted_at IS NULL
             LIMIT 1`;
      params = [orgId, frameworkId, moduleId, subModuleId];
    }

    const result = await query<Document>(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching document:", error);
    return null;
  }
}

/**
 * Create or update a document
 * Returns the document ID (UUID).
 */
export async function upsertDocument(
  doc: Omit<Document, "id" | "created_at" | "updated_at" | "deleted_at">,
): Promise<string> {
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO document 
       (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id, 
        title, status, content_key, current_version, analysis_score, renewal, doc_type, 
        created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       ON CONFLICT (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         status = EXCLUDED.status,
         content_key = EXCLUDED.content_key,
         current_version = EXCLUDED.current_version,
         analysis_score = EXCLUDED.analysis_score,
         renewal = EXCLUDED.renewal,
         doc_type = EXCLUDED.doc_type,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id`,
      [
        doc.org_id,
        doc.framework_id,
        doc.module_id,
        doc.sub_module_id,
        doc.sub_sub_module_id,
        doc.title,
        doc.status,
        doc.content_key,
        doc.current_version,
        doc.analysis_score || null,
        doc.renewal || null,
        doc.doc_type || null,
        doc.created_by || doc.updated_by,
        doc.updated_by || doc.created_by,
      ],
    );
    return result.rows[0].id;
  } catch (error) {
    console.error("Error upserting document:", error);
    throw new Error(
      `Failed to upsert document: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(
  documentId: string,
  orgId: string,
): Promise<Document | null> {
  try {
    const result = await query<Document>(
      `SELECT * FROM document 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL
       LIMIT 1`,
      [documentId, orgId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching document by ID:", error);
    return null;
  }
}

/**
 * Soft delete a document
 */
export async function deleteDocument(
  documentId: string,
  orgId: string,
  deletedBy: string,
): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE document 
       SET deleted_at = NOW(), updated_by = $3, updated_at = NOW()
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [documentId, orgId, deletedBy],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error deleting document:", error);
    throw new Error(
      `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get documents for a specific sub-module (including all sub-sub-modules)
 */
export async function getDocumentsBySubModule(
  orgId: string,
  frameworkId: string,
  moduleId: string,
  subModuleId: string,
): Promise<Document[]> {
  try {
    const result = await query<Document>(
      `SELECT * FROM document 
       WHERE org_id = $1 AND framework_id = $2 
       AND module_id = $3 AND sub_module_id = $4
       AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [orgId, frameworkId, moduleId, subModuleId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching documents by sub-module:", error);
    throw new Error(
      `Failed to fetch documents: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Create a document revision record
 * Called whenever a document is created, edited, or published
 */
export async function createDocumentRevision(
  documentId: string,
  orgId: string,
  version: number,
  action: "created" | "edited" | "published" | "restored",
  contentKey: string,
  status: "draft" | "published" | "archived",
  userId: string,
  notes?: string | null,
): Promise<string> {
  try {
    const result = await query<{ id: string }>(
      `INSERT INTO document_revision 
       (document_id, org_id, version, action, content_key, status, user_id, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [documentId, orgId, version, action, contentKey, status, userId, notes || null],
    );
    return result.rows[0].id;
  } catch (error) {
    console.error("Error creating document revision:", error);
    throw new Error(
      `Failed to create document revision: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get all revisions for a document
 */
export async function getDocumentRevisions(
  documentId: string,
  orgId: string,
): Promise<DocumentRevision[]> {
  try {
    const result = await query<DocumentRevision>(
      `SELECT * FROM document_revision 
       WHERE document_id = $1 AND org_id = $2
       ORDER BY version DESC`,
      [documentId, orgId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching document revisions:", error);
    throw new Error(
      `Failed to fetch document revisions: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get a specific revision by version number
 */
export async function getDocumentRevisionByVersion(
  documentId: string,
  orgId: string,
  version: number,
): Promise<DocumentRevision | null> {
  try {
    const result = await query<DocumentRevision>(
      `SELECT * FROM document_revision 
       WHERE document_id = $1 AND org_id = $2 AND version = $3
       LIMIT 1`,
      [documentId, orgId, version],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching document revision:", error);
    return null;
  }
}
