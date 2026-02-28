import { query } from "@/lib/db/postgres";

export type ArtifactType = "job_template" | "company_document" | "log_template";

export type ComplianceArtifactLink = {
  id: string;
  compliance_doc_id: string;
  artifact_type: ArtifactType;
  artifact_id: string;
  created_at: Date;
  created_by: string | null;
};

export type CreateLinkInput = {
  compliance_doc_id: string;
  artifact_type: ArtifactType;
  artifact_id: string;
  created_by?: string | null;
};

/**
 * Create a new link between a compliance document and an artifact
 */
export const createLink = async (
  complianceDocId: string,
  artifactType: ArtifactType,
  artifactId: string,
  userId?: string | null,
): Promise<ComplianceArtifactLink | null> => {
  try {
    const result = await query<ComplianceArtifactLink>(
      `
      INSERT INTO compliance_artifact_links (
        compliance_doc_id,
        artifact_type,
        artifact_id,
        created_by
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [complianceDocId, artifactType, artifactId, userId || null],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error creating compliance artifact link:", error);
    return null;
  }
};

/**
 * Delete a link between a compliance document and an artifact
 */
export const deleteLink = async (
  complianceDocId: string,
  artifactType: ArtifactType,
  artifactId: string,
): Promise<boolean> => {
  try {
    const result = await query(
      `
      DELETE FROM compliance_artifact_links
      WHERE compliance_doc_id = $1
        AND artifact_type = $2
        AND artifact_id = $3
      `,
      [complianceDocId, artifactType, artifactId],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error deleting compliance artifact link:", error);
    return false;
  }
};

/**
 * Get all links for a compliance document
 */
export const getLinksForComplianceDoc = async (
  complianceDocId: string,
): Promise<ComplianceArtifactLink[]> => {
  try {
    const result = await query<ComplianceArtifactLink>(
      `
      SELECT *
      FROM compliance_artifact_links
      WHERE compliance_doc_id = $1
      ORDER BY created_at DESC
      `,
      [complianceDocId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching compliance artifact links:", error);
    return [];
  }
};

/**
 * Get linked artifact IDs for a compliance document filtered by artifact type
 */
export const getLinkedArtifactIds = async (
  complianceDocId: string,
  artifactType: ArtifactType,
): Promise<string[]> => {
  try {
    const result = await query<{ artifact_id: string }>(
      `
      SELECT artifact_id
      FROM compliance_artifact_links
      WHERE compliance_doc_id = $1
        AND artifact_type = $2
      ORDER BY created_at DESC
      `,
      [complianceDocId, artifactType],
    );
    return result.rows.map((row) => row.artifact_id);
  } catch (error) {
    console.error("Error fetching linked artifact IDs:", error);
    return [];
  }
};

/**
 * Get all compliance documents that link to a specific artifact
 * (Reverse lookup)
 */
export const getComplianceDocsForArtifact = async (
  artifactType: ArtifactType,
  artifactId: string,
): Promise<ComplianceArtifactLink[]> => {
  try {
    const result = await query<ComplianceArtifactLink>(
      `
      SELECT *
      FROM compliance_artifact_links
      WHERE artifact_type = $1
        AND artifact_id = $2
      ORDER BY created_at DESC
      `,
      [artifactType, artifactId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching compliance docs for artifact:", error);
    return [];
  }
};

/**
 * Check if a link exists between a compliance document and an artifact
 */
export const linkExists = async (
  complianceDocId: string,
  artifactType: ArtifactType,
  artifactId: string,
): Promise<boolean> => {
  try {
    const result = await query(
      `
      SELECT 1
      FROM compliance_artifact_links
      WHERE compliance_doc_id = $1
        AND artifact_type = $2
        AND artifact_id = $3
      LIMIT 1
      `,
      [complianceDocId, artifactType, artifactId],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error checking link existence:", error);
    return false;
  }
};

/**
 * Delete all links for a compliance document
 * (Useful when deleting a compliance document)
 */
export const deleteAllLinksForComplianceDoc = async (
  complianceDocId: string,
): Promise<number> => {
  try {
    const result = await query(
      `
      DELETE FROM compliance_artifact_links
      WHERE compliance_doc_id = $1
      `,
      [complianceDocId],
    );
    return result.rowCount ?? 0;
  } catch (error) {
    console.error("Error deleting all links for compliance doc:", error);
    return 0;
  }
};

/**
 * Get count of links grouped by artifact type for a compliance document
 */
export const getLinkCountsByType = async (
  complianceDocId: string,
): Promise<Record<ArtifactType, number>> => {
  try {
    const result = await query<{
      artifact_type: ArtifactType;
      count: string;
    }>(
      `
      SELECT 
        artifact_type,
        COUNT(*) as count
      FROM compliance_artifact_links
      WHERE compliance_doc_id = $1
      GROUP BY artifact_type
      `,
      [complianceDocId],
    );

    const counts: Record<ArtifactType, number> = {
      job_template: 0,
      company_document: 0,
      log_template: 0,
    };

    for (const row of result.rows) {
      counts[row.artifact_type] = Number.parseInt(row.count, 10);
    }

    return counts;
  } catch (error) {
    console.error("Error fetching link counts by type:", error);
    return {
      job_template: 0,
      company_document: 0,
      log_template: 0,
    };
  }
};
