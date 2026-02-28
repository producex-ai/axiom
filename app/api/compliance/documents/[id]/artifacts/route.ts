/**
 * API Routes for Compliance Artifact Links
 * 
 * GET /api/compliance/documents/[id]/artifacts
 * Retrieve all artifacts linked to a compliance document
 * 
 * POST /api/compliance/documents/[id]/artifacts
 * Link an artifact to a compliance document
 * 
 * DELETE /api/compliance/documents/[id]/artifacts
 * Unlink an artifact from a compliance document
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import {
  linkArtifact,
  unlinkArtifact,
  getLinkedArtifactsWithDetails,
  NotFoundError,
  ValidationError,
} from "@/lib/services/complianceArtifactService";
import type { ArtifactType } from "@/db/queries/compliance-artifact-links";
import type { JobTemplate } from "@/lib/services/jobTemplateService";
import type { Document } from "@/lib/primus/db-helper";
import type { LogTemplateWithSchedule } from "@/db/queries/log-templates";

/**
 * Type guard for JobTemplate
 */
function isJobTemplate(artifact: unknown): artifact is JobTemplate {
  return (
    typeof artifact === "object" &&
    artifact !== null &&
    "active" in artifact &&
    "category" in artifact
  );
}

/**
 * Type guard for Document (Company Document)
 */
function isDocument(artifact: unknown): artifact is Document {
  return (
    typeof artifact === "object" &&
    artifact !== null &&
    "framework_id" in artifact &&
    "module_id" in artifact
  );
}

/**
 * Type guard for LogTemplate
 */
function isLogTemplate(artifact: unknown): artifact is LogTemplateWithSchedule {
  return (
    typeof artifact === "object" &&
    artifact !== null &&
    "template_type" in artifact &&
    "items" in artifact
  );
}

/**
 * Validate artifact type
 */
function isValidArtifactType(type: string): type is ArtifactType {
  return ["job_template", "company_document", "log_template"].includes(type);
}

/**
 * GET - Retrieve all linked artifacts for a compliance document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;
    const { id: docId } = await params;

    // Fetch all linked artifacts with details
    const linksWithDetails = await getLinkedArtifactsWithDetails(docId, orgId);

    // Group artifacts by type
    const jobTemplates: JobTemplate[] = [];
    const logTemplates: LogTemplateWithSchedule[] = [];
    const companyDocuments: Document[] = [];

    for (const link of linksWithDetails) {
      if (!link.artifact) {
        // Skip artifacts that couldn't be fetched (deleted or missing)
        continue;
      }

      switch (link.artifact_type) {
        case "job_template":
          if (isJobTemplate(link.artifact)) {
            jobTemplates.push(link.artifact);
          }
          break;
        case "log_template":
          if (isLogTemplate(link.artifact)) {
            logTemplates.push(link.artifact);
          }
          break;
        case "company_document":
          if (isDocument(link.artifact)) {
            companyDocuments.push(link.artifact);
          }
          break;
      }
    }

    return NextResponse.json({
      success: true,
      jobTemplates,
      logTemplates,
      companyDocuments,
    });
  } catch (error) {
    console.error("[API] Error fetching linked artifacts:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch linked artifacts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Link an artifact to a compliance document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;
    const { id: docId } = await params;

    // Parse request body
    const body = await request.json();
    const { artifactType, artifactId } = body;

    // Validate input
    if (!artifactType || typeof artifactType !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'artifactType' field" },
        { status: 400 },
      );
    }

    if (!artifactId || typeof artifactId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'artifactId' field" },
        { status: 400 },
      );
    }

    // Validate artifact type
    if (!isValidArtifactType(artifactType)) {
      return NextResponse.json(
        {
          error: "Invalid artifact type",
          details: "Must be one of: job_template, company_document, log_template",
        },
        { status: 400 },
      );
    }

    // Create the link
    const link = await linkArtifact(
      docId,
      artifactType,
      artifactId,
      orgId,
      userId,
    );

    return NextResponse.json(
      {
        success: true,
        link: {
          id: link.id,
          complianceDocId: link.compliance_doc_id,
          artifactType: link.artifact_type,
          artifactId: link.artifact_id,
          createdAt: link.created_at,
          createdBy: link.created_by,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API] Error creating artifact link:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 },
      );
    }

    // Check for duplicate link error (unique constraint violation)
    if (
      error instanceof Error &&
      (error.message.includes("duplicate") ||
        error.message.includes("unique constraint"))
    ) {
      return NextResponse.json(
        { error: "Link already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create artifact link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Unlink an artifact from a compliance document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;
    const { id: docId } = await params;

    // Parse request body
    const body = await request.json();
    const { artifactType, artifactId } = body;

    // Validate input
    if (!artifactType || typeof artifactType !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'artifactType' field" },
        { status: 400 },
      );
    }

    if (!artifactId || typeof artifactId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'artifactId' field" },
        { status: 400 },
      );
    }

    // Validate artifact type
    if (!isValidArtifactType(artifactType)) {
      return NextResponse.json(
        {
          error: "Invalid artifact type",
          details: "Must be one of: job_template, company_document, log_template",
        },
        { status: 400 },
      );
    }

    // Delete the link
    const deleted = await unlinkArtifact(
      docId,
      artifactType,
      artifactId,
      orgId,
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Artifact link deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting artifact link:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to delete artifact link",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
