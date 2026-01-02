import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { createDocumentRevision, upsertDocument } from "@/lib/primus/db-helper";
import { createDocxBufferFromText } from "@/server/docgen";
import { callLLM_fillTemplate } from "@/server/llm";
import { loadModuleSpec, loadSubmoduleSpec } from "@/server/primus/loader";
import {
  cutoffAfterSignatures,
  formatValidationReport,
  hasPostSignatureContent,
  sanitizeOutput,
  stripComplianceAnnotations,
  validateLLMOutput,
} from "@/server/primus/output_validator";
import { buildRequirementsList } from "@/server/primus/structure_builder";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for LLM generation

const s3 = new S3Client({ region: process.env.AWS_REGION! });

/**
 * POST /api/compliance/generate
 * Generate a Primus compliance document from specification
 *
 * Request body:
 * - moduleNumber: string (e.g., "1", "5")
 * - subModuleCode: string (e.g., "1.01", "5.12", "4.04.01")
 * - answers: Record<string, string | boolean> (compliance answers from form)
 *
 * Returns:
 * - success: boolean
 * - contentKey: string (S3 key for document)
 * - fileName: string
 * - metadata: object
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and get user context
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;

    const body = await request.json();
    const { moduleNumber, subModuleCode, answers } = body;

    // Validate inputs
    if (!moduleNumber || !subModuleCode) {
      return NextResponse.json(
        { error: "moduleNumber and subModuleCode are required" },
        { status: 400 },
      );
    }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "answers are required" },
        { status: 400 },
      );
    }

    console.log("[API] Generating document from spec:", {
      orgId,
      userId,
      moduleNumber,
      subModuleCode,
      answerCount: Object.keys(answers).length,
    });

    // Load module and submodule specifications
    const moduleSpec = loadModuleSpec(moduleNumber);
    const submoduleSpec = loadSubmoduleSpec(moduleNumber, subModuleCode);

    console.log(`[API] Loaded spec: ${submoduleSpec.title}`);
    console.log(
      `[API] Requirements: ${submoduleSpec.requirements.length} total`,
    );

    // Build deterministic requirements list using structure_builder
    const requirementsList = buildRequirementsList(
      moduleNumber,
      submoduleSpec.title,
      submoduleSpec.code,
    );

    console.log(
      `[API] Built requirements list with ${requirementsList.split("\n").length} lines`,
    );

    // Prepare module context for LLM
    const moduleContext = {
      moduleNumber: moduleSpec.module,
      moduleName: moduleSpec.moduleName,
      complianceStandard: "Primus GFS v4.0",
      submoduleCode: submoduleSpec.code,
      submoduleTitle: submoduleSpec.title,
    };

    // Extract core fields from answers
    const companyName = answers.company_name || "[Organization Name]";
    const facilityName = answers.facility_name || "[Facility Name]";
    const effectiveDate =
      answers.effective_date || new Date().toISOString().split("T")[0];
    const approvedBy = answers.approved_by || "[Responsible Manager]";
    const documentNumber =
      answers.document_number || `${submoduleSpec.code}-001`;
    const documentVersion = answers.document_version || "1.0";

    // Build compliance context from requirement-based answers
    let complianceContext = "";
    if (answers) {
      complianceContext = "\n## Organization's Compliance Responses:\n";
      Object.entries(answers).forEach(([key, value]) => {
        if (key.startsWith("requirement_")) {
          const requirementCode = key
            .replace("requirement_", "")
            .replace(/_/g, ".");
          complianceContext += `- ${requirementCode}: ${typeof value === "boolean" ? (value ? "Yes/Implemented" : "No/Not Implemented") : value}\n`;
        }
      });
    }

    // Create document structure guidance for LLM
    const structureGuidance = `
# Document Structure for ${submoduleSpec.title}

## Required Sections:
1. Title Page
   - Document title: "${submoduleSpec.title}"
   - Organization: ${companyName}
   - Facility: ${facilityName}
   - Effective Date: ${effectiveDate}
   - Document Number: ${documentNumber}
   - Document Version: ${documentVersion}
   - Document Code: ${submoduleSpec.code}

2. Purpose & Scope
   - Purpose: ${submoduleSpec.description}
   - Applies to: All operations at ${facilityName}

3. Definitions & References
   - Key terms relevant to ${submoduleSpec.title}
   - Reference: Primus GFS v4.0 Section ${submoduleSpec.code}

4. Responsibilities
   - ${approvedBy}: Overall accountability
   - ${facilityName} Management Team: Implementation and monitoring

5. Procedures
   ${requirementsList}
${complianceContext}

6. Monitoring & Verification
   - Daily monitoring activities
   - Weekly verification checks
   - Record keeping requirements

7. Corrective Actions
   - Non-conformance reporting
   - Investigation procedures
   - Preventive measures

8. Records & Documentation
   - Forms and checklists
   - Record retention (minimum 2 years)
   - Document control

9. Training
   - Initial training requirements
   - Refresher training schedule
   - Competency verification

10. Revision History
    - Version ${documentVersion} - ${effectiveDate}
    - Issued by: ${approvedBy}

11. Approval Signatures
    - Prepared by: _________________ Date: _________
    - Reviewed by: _________________ Date: _________
    - Approved by: ${approvedBy} _________ Date: _________

IMPORTANT: When writing procedures, incorporate the organization's compliance responses above to create substantive, organization-specific content. Do not generate generic placeholder text.
`;

    // Generate document using LLM with spec-based structure
    console.log("[API] Calling LLM for document generation...");

    const generatedContent = await callLLM_fillTemplate(
      structureGuidance,
      answers,
      moduleContext,
      true, // Use spec-based mode
      `${submoduleSpec.code}_${submoduleSpec.title.replace(/[^a-zA-Z0-9]/g, "_")}`,
    );

    // Validation and sanitization
    console.log("[API] Validating LLM output...");
    const validation = validateLLMOutput(generatedContent);

    if (!validation.valid) {
      console.warn("[API] ⚠️ Validation detected issues:");
      console.warn(formatValidationReport(validation));
    }

    // Check for post-signature content
    if (hasPostSignatureContent(generatedContent)) {
      console.warn("[API] ⚠️ Post-signature content detected. Applying cutoff.");
    }

    // Sanitize and clean
    let cleanedContent = stripComplianceAnnotations(
      sanitizeOutput(generatedContent),
    );

    // Apply signature cutoff
    cleanedContent = cutoffAfterSignatures(cleanedContent);

    // Final check
    if (hasPostSignatureContent(cleanedContent)) {
      console.error(
        "[API] ❌ Post-signature content still present! Applying aggressive cutoff.",
      );
      cleanedContent = cutoffAfterSignatures(cleanedContent);
    }

    // Convert to DOCX
    console.log("[API] Creating DOCX document...");
    const docxBuffer = await createDocxBufferFromText(cleanedContent);

    // Upload to S3 with proper naming convention per DB schema
    const timestamp = Date.now();
    const sanitizedTitle = submoduleSpec.title.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${subModuleCode}_${sanitizedTitle}_v1.docx`;

    // S3 key following pattern: primus_gfs/{moduleNumber}/{subModuleCode}/v{version}_{timestamp}.docx
    const s3Key = `primus_gfs/${moduleNumber}/${subModuleCode}/v1_${timestamp}.docx`;

    console.log(`[API] Uploading to S3: ${s3Key}`);

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Body: docxBuffer,
        ContentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Metadata: {
          moduleNumber,
          subModuleCode,
          subModuleTitle: submoduleSpec.title,
          documentVersion: documentVersion,
          generatedAt: new Date().toISOString(),
        },
      }),
    );

    console.log("[API] ✅ Document generated successfully!");

    // Insert document record into database
    console.log("[API] Inserting document record into database...");

    // Parse sub-module code to check if it's a sub-sub-module (e.g., "4.04.01")
    const codeParts = subModuleCode.split(".");
    const isSubSubModule = codeParts.length === 3;
    const actualSubModuleId = isSubSubModule
      ? `${codeParts[0]}.${codeParts[1]}`
      : subModuleCode;
    const subSubModuleId = isSubSubModule ? subModuleCode : null;

    const documentId = await upsertDocument({
      org_id: orgId,
      framework_id: "primus_gfs",
      module_id: moduleNumber,
      sub_module_id: actualSubModuleId,
      sub_sub_module_id: subSubModuleId,
      title: submoduleSpec.title,
      status: "draft",
      content_key: s3Key,
      current_version: 1,
      created_by: userId,
      updated_by: userId, // Set updated_by to track who created/updated the document
      analysis_score: null,
    });

    console.log(`[API] Document record created with ID: ${documentId}`);

    // Create revision record for initial document creation
    await createDocumentRevision(
      documentId,
      orgId,
      1,
      "created",
      s3Key,
      "draft",
      userId,
      "Initial document generated from specification",
    );

    console.log(`[API] Revision record created for document ${documentId}`);

    return NextResponse.json(
      {
        success: true,
        documentId,
        contentKey: s3Key,
        fileName: fileName,
        message: "Document generated successfully",
        metadata: {
          moduleNumber,
          subModuleCode,
          subModuleTitle: submoduleSpec.title,
          requirementsCount: submoduleSpec.requirements.length,
          documentVersion: documentVersion,
          validationStatus: validation.valid
            ? "passed"
            : "passed_with_warnings",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error generating document from spec:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          error: "Specification not available",
          details: error.message,
          hint: "This module or submodule specification has not been created yet.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
