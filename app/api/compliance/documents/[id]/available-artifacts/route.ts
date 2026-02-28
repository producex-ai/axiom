/**
 * GET /api/compliance/documents/[id]/available-artifacts
 * 
 * Retrieve artifacts that can be linked to a compliance document.
 * Excludes artifacts that are already linked.
 * 
 * Returns:
 * - JobTemplates: Organization-level templates
 * - LogTemplates: Organization-level templates
 * - CompanyDocuments: Sub-module level documents (ONLY company docs, excludes compliance docs)
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { getDocumentById, getCompanyDocumentsBySubModule } from "@/lib/primus/db-helper";
import { getTemplates, type JobTemplate } from "@/lib/services/jobTemplateService";
import { getLogTemplates, type LogTemplateWithSchedule } from "@/db/queries/log-templates";
import { getLinkedArtifacts } from "@/lib/services/complianceArtifactService";

/**
 * GET - Retrieve available artifacts for linking
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


    // Step 1: Fetch ComplianceDoc
    const complianceDoc = await getDocumentById(docId, orgId);

    if (!complianceDoc) {
      return NextResponse.json(
        { error: "Compliance document not found" },
        { status: 404 },
      );
    }

    // Verify it's a compliance document (not a company document)
    if (complianceDoc.doc_type === "company") {
      return NextResponse.json(
        { error: "Document is not a compliance document" },
        { status: 400 },
      );
    }

    // Step 2: Get sub_module_id and other identifiers
    const { sub_module_id, framework_id, module_id } = complianceDoc;

    if (!sub_module_id || !framework_id || !module_id) {
      return NextResponse.json(
        { error: "Compliance document is missing required identifiers" },
        { status: 400 },
      );
    }

    // Step 3: Fetch all artifacts in parallel
    const [allJobTemplates, allLogTemplates, allCompanyDocuments, linkedArtifacts] =
      await Promise.all([
        getTemplates(orgId),
        getLogTemplates(orgId),
        getCompanyDocumentsBySubModule(orgId, framework_id, module_id, sub_module_id),
        getLinkedArtifacts(docId, orgId),
      ]);

    // Step 4: Create a set of already linked artifact IDs by type
    const linkedJobTemplateIds = new Set<string>();
    const linkedLogTemplateIds = new Set<string>();
    const linkedCompanyDocIds = new Set<string>();

    for (const link of linkedArtifacts) {
      switch (link.artifact_type) {
        case "job_template":
          linkedJobTemplateIds.add(link.artifact_id);
          break;
        case "log_template":
          linkedLogTemplateIds.add(link.artifact_id);
          break;
        case "company_document":
          linkedCompanyDocIds.add(link.artifact_id);
          break;
      }
    }

    // Step 5: Filter out already linked artifacts and sort by relevance
    const availableJobTemplates = allJobTemplates
      .filter(
        (template) => 
          template.active && // Only include active templates
          !linkedJobTemplateIds.has(template.id)
      )
      .sort((a, b) => {
        // Prioritize templates matching current sub-module's sop
        const aMatches = a.sop === sub_module_id;
        const bMatches = b.sop === sub_module_id;
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        // Then sort by name
        return a.name.localeCompare(b.name);
      });

    const availableLogTemplates = allLogTemplates
      .filter(
        (template) => !linkedLogTemplateIds.has(template.id),
      )
      .sort((a, b) => {
        // Prioritize templates matching current sub-module's sop
        const aMatches = a.sop === sub_module_id;
        const bMatches = b.sop === sub_module_id;
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        // Then sort by name
        return a.name.localeCompare(b.name);
      });

    const availableCompanyDocuments = allCompanyDocuments.filter(
      (doc) => !linkedCompanyDocIds.has(doc.id),
    );

    // Return response with current sub_module_id for UI highlighting
    return NextResponse.json({
      success: true,
      currentSubModuleId: sub_module_id,
      jobTemplates: availableJobTemplates,
      logTemplates: availableLogTemplates,
      companyDocuments: availableCompanyDocuments,
    });
  } catch (error) {
    console.error("[API] Error fetching available artifacts:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch available artifacts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
