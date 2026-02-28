/**
 * Compliance Artifact Linking Service
 *
 * Business logic for linking compliance documents to operational artifacts.
 * Validates org_id and sub_module_id constraints before creating links.
 *
 * Supported artifact types:
 * - job_template: Organization-level job templates (org_id validation only)
 * - company_document: Sub-module level company documents (org_id + sub_module_id validation)
 * - log_template: Organization-level log templates (org_id validation only)
 */

import type { Document } from "@/lib/primus/db-helper";
import { getDocumentById } from "@/lib/primus/db-helper";
import { getTemplateById, type JobTemplate } from "@/lib/services/jobTemplateService";
import {
  getLogTemplateById,
  type LogTemplate,
  type LogTemplateWithSchedule,
} from "@/db/queries/log-templates";
import {
  createLink as createLinkRepo,
  deleteLink as deleteLinkRepo,
  getLinksForComplianceDoc as getLinksRepo,
  type ArtifactType,
  type ComplianceArtifactLink,
} from "@/db/queries/compliance-artifact-links";

/**
 * Artifact union type for type safety
 */
type Artifact = JobTemplate | Document | LogTemplateWithSchedule;

/**
 * Type guard for JobTemplate
 */
function isJobTemplate(artifact: Artifact): artifact is JobTemplate {
  return "active" in artifact && "category" in artifact;
}

/**
 * Type guard for Document
 */
function isDocument(artifact: Artifact): artifact is Document {
  return "framework_id" in artifact && "module_id" in artifact;
}

/**
 * Type guard for LogTemplate
 */
function isLogTemplate(artifact: Artifact): artifact is LogTemplateWithSchedule {
  return "template_type" in artifact && "items" in artifact;
}

/**
 * Helper to safely get org_id from any artifact type
 */
function getArtifactOrgId(artifact: Artifact): string {
  if (isJobTemplate(artifact)) {
    return artifact.org_id;
  }
  if (isDocument(artifact)) {
    return artifact.org_id;
  }
  if (isLogTemplate(artifact)) {
    return artifact.org_id || "";
  }
  throw new Error("Unknown artifact type");
}

/**
 * Error types for link operations
 */
export class ArtifactLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactLinkError";
  }
}

export class ValidationError extends ArtifactLinkError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ArtifactLinkError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Fetch artifact by type and ID
 */
async function getArtifactByType(
  artifactType: ArtifactType,
  artifactId: string,
  orgId: string,
): Promise<Artifact | null> {
  switch (artifactType) {
    case "job_template": {
      const template = await getTemplateById(artifactId, orgId);
      return template;
    }
    case "company_document": {
      // Get document and verify it's a company document
      const document = await getDocumentById(artifactId, orgId);
      if (!document) {
        return null;
      }
      // Company documents should have doc_type = 'company'
      // As a fallback, also check if content_key contains 'company-documents/' (for older docs)
      const isCompanyDoc = 
        document.doc_type === "company" || 
        (document.content_key && document.content_key.includes("company-documents/"));
      
      if (!isCompanyDoc) {
        throw new ValidationError(
          `Document ${artifactId} is not a company document (doc_type: ${document.doc_type})`,
        );
      }
      return document;
    }
    case "log_template": {
      const template = await getLogTemplateById(artifactId, orgId);
      return template;
    }
    default: {
      throw new ValidationError(`Unsupported artifact type: ${artifactType}`);
    }
  }
}

/**
 * Validate that artifact can be linked to compliance document
 */
async function validateLinkConstraints(
  complianceDoc: Document,
  artifact: Artifact,
  artifactType: ArtifactType,
): Promise<void> {
  // All artifacts must belong to the same organization
  const artifactOrgId = getArtifactOrgId(artifact);
  if (complianceDoc.org_id !== artifactOrgId) {
    throw new ValidationError(
      `Artifact must belong to the same organization as the compliance document`,
    );
  }

  // Type-specific validation
  switch (artifactType) {
    case "job_template": {
      // Job templates are org-level, no sub_module_id validation needed
      // We've already validated org_id above
      const template = artifact as JobTemplate;
      if (!template.active) {
        throw new ValidationError(
          `Cannot link to inactive job template: ${template.name}`,
        );
      }
      break;
    }
    case "log_template": {
      // Log templates are org-level, no sub_module_id validation needed
      // We've already validated org_id above
      break;
    }
    case "company_document": {
      // Company documents must match sub_module_id
      const document = artifact as Document;
      if (complianceDoc.sub_module_id !== document.sub_module_id) {
        throw new ValidationError(
          `Company document must belong to the same sub-module as the compliance document. ` +
            `Expected: ${complianceDoc.sub_module_id}, Got: ${document.sub_module_id}`,
        );
      }
      break;
    }
  }
}

/**
 * Link an artifact to a compliance document
 *
 * @param complianceDocId - Compliance document ID
 * @param artifactType - Type of artifact (job_template | company_document | log_template)
 * @param artifactId - Artifact ID
 * @param orgId - Organization ID for validation
 * @param userId - User ID creating the link (optional)
 * @returns Created link or null on failure
 * @throws {NotFoundError} If compliance doc or artifact not found
 * @throws {ValidationError} If validation constraints fail
 */
export async function linkArtifact(
  complianceDocId: string,
  artifactType: ArtifactType,
  artifactId: string,
  orgId: string,
  userId?: string,
): Promise<ComplianceArtifactLink> {
  // 1. Fetch compliance document
  const complianceDoc = await getDocumentById(complianceDocId, orgId);
  if (!complianceDoc) {
    throw new NotFoundError(
      `Compliance document not found: ${complianceDocId}`,
    );
  }

  // Verify it's a compliance document (not a company document)
  if (complianceDoc.doc_type === "company") {
    throw new ValidationError(
      `Document ${complianceDocId} is a company document, not a compliance document`,
    );
  }

  // 2. Fetch artifact
  const artifact = await getArtifactByType(artifactType, artifactId, orgId);
  if (!artifact) {
    throw new NotFoundError(
      `${artifactType} not found: ${artifactId}`,
    );
  }

  // 3. Validate link constraints
  await validateLinkConstraints(complianceDoc, artifact, artifactType);

  // 4. Create link in database
  const link = await createLinkRepo(
    complianceDocId,
    artifactType,
    artifactId,
    userId,
  );

  if (!link) {
    throw new ArtifactLinkError(
      `Failed to create link between ${complianceDocId} and ${artifactType}:${artifactId}`,
    );
  }

  return link;
}

/**
 * Unlink an artifact from a compliance document
 *
 * @param complianceDocId - Compliance document ID
 * @param artifactType - Type of artifact
 * @param artifactId - Artifact ID
 * @param orgId - Organization ID for validation
 * @returns True if link was deleted, false if not found
 * @throws {NotFoundError} If compliance doc not found
 */
export async function unlinkArtifact(
  complianceDocId: string,
  artifactType: ArtifactType,
  artifactId: string,
  orgId: string,
): Promise<boolean> {
  // Verify compliance document exists and belongs to org
  const complianceDoc = await getDocumentById(complianceDocId, orgId);
  if (!complianceDoc) {
    throw new NotFoundError(
      `Compliance document not found: ${complianceDocId}`,
    );
  }

  // Delete the link
  const deleted = await deleteLinkRepo(
    complianceDocId,
    artifactType,
    artifactId,
  );

  return deleted;
}

/**
 * Get all linked artifacts for a compliance document
 *
 * @param complianceDocId - Compliance document ID
 * @param orgId - Organization ID for validation
 * @returns Array of links
 * @throws {NotFoundError} If compliance doc not found
 */
export async function getLinkedArtifacts(
  complianceDocId: string,
  orgId: string,
): Promise<ComplianceArtifactLink[]> {
  // Verify compliance document exists and belongs to org
  const complianceDoc = await getDocumentById(complianceDocId, orgId);
  if (!complianceDoc) {
    throw new NotFoundError(
      `Compliance document not found: ${complianceDocId}`,
    );
  }

  // Fetch all links
  const links = await getLinksRepo(complianceDocId);
  return links;
}

/**
 * Get linked artifacts with full artifact details
 *
 * @param complianceDocId - Compliance document ID
 * @param orgId - Organization ID for validation
 * @returns Array of links with populated artifact details
 */
export async function getLinkedArtifactsWithDetails(
  complianceDocId: string,
  orgId: string,
): Promise<
  Array<ComplianceArtifactLink & { artifact: Artifact | null }>
> {
  const links = await getLinkedArtifacts(complianceDocId, orgId);

  // Fetch artifact details for each link
  const linksWithDetails = await Promise.all(
    links.map(async (link) => {
      try {
        const artifact = await getArtifactByType(
          link.artifact_type,
          link.artifact_id,
          orgId,
        );
        return {
          ...link,
          artifact,
        };
      } catch (error) {
        console.error(
          `Error fetching artifact ${link.artifact_type}:${link.artifact_id}`,
          error,
        );
        return {
          ...link,
          artifact: null,
        };
      }
    }),
  );

  return linksWithDetails;
}
