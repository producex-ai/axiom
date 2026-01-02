/**
 * POST /api/compliance/improve
 * Generate improved document with missing sections filled by LLM
 * 
 * Creates/updates a document in the main "document" table with improved content.
 * This is the final destination - improved documents become regular documents.
 *
 * Request Body:
 * {
 *   "subModuleId": "clx...",
 *   "analysisId": "clx..."  // ID from previous compliance analysis
 * }
 *
 * Process:
 * 1. Fetch evidence documents
 * 2. Fetch ComplianceAnalysis (for missing requirements)
 * 3. Fetch SubModule checklist
 * 4. Download extracted texts from S3
 * 5. Call LLM with improve prompt (generates missing sections)
 * 6. Add metadata header to document
 * 7. Convert to DOCX format
 * 8. Upload to S3
 * 9. Create/Update document record (unified table)
 * 10. Create document_source entry (audit trail)
 * 11. Return document info
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";
import { getFromS3, uploadToS3 } from "@/lib/s3-utils";
import { improveDocument } from "@/lib/llm-improve";
import { createDocxBufferFromText } from "@/server/docgen";
import { loadSubmoduleSpec } from "@/server/primus/loader";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes - Vercel hobby plan max

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;
    const { subModuleId, analysisId } = (await request.json()) as {
      subModuleId: string;
      analysisId: string;
    };

    if (!subModuleId || !analysisId) {
      return NextResponse.json(
        {
          error: "subModuleId and analysisId are required",
        },
        { status: 400 },
      );
    }

    console.log("[API] Starting document improvement:", {
      orgId,
      userId,
      subModuleId,
      analysisId,
    });

    // Parse subModuleId to get moduleNumber and code
    const [moduleNumber] = subModuleId.split(".");
    const subModuleCode = subModuleId;

    // Fetch compliance analysis
    const analysisResult = await query(
      `SELECT analysis_result FROM compliance_analysis 
       WHERE id = $1 AND org_id = $2`,
      [analysisId, orgId],
    );

    if (analysisResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Compliance analysis not found",
        },
        { status: 404 },
      );
    }

    // Handle both JSON object and stringified JSON from database
    const analysisData = analysisResult.rows[0].analysis_result;
    const analysis = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;

    console.log("[API] Retrieved compliance analysis");

    // Fetch evidence documents
    const evidenceResult = await query(
      `SELECT id, filename, extracted_text_key FROM uploaded_evidence 
       WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
       ORDER BY uploaded_at ASC
       LIMIT 3`,
      [orgId, subModuleId],
    );

    const evidenceFiles = evidenceResult.rows;

    if (evidenceFiles.length === 0) {
      return NextResponse.json(
        {
          error: "No evidence files found",
        },
        { status: 400 },
      );
    }

    console.log(`[API] Found ${evidenceFiles.length} evidence file(s)`);

    // Download extracted texts from S3
    const documents: { fileName: string; text: string }[] = [];

    for (const evidence of evidenceFiles) {
      try {
        const textBuffer = await getFromS3(evidence.extracted_text_key);
        const text =
          textBuffer instanceof Buffer
            ? textBuffer.toString("utf-8")
            : (textBuffer as string);

        documents.push({
          fileName: evidence.filename,
          text,
        });

        console.log(
          `[API] Retrieved text for improvement: ${evidence.filename}`,
        );
      } catch (error) {
        console.error(
          `[API] Error retrieving text for ${evidence.filename}:`,
          error,
        );
        throw new Error(`Failed to retrieve text for ${evidence.filename}`);
      }
    }

    // Load submodule spec to get requirements
    let checklist: any;
    try {
      const spec = loadSubmoduleSpec(moduleNumber, subModuleCode);
      checklist = spec.requirements || [];
    } catch (error) {
      console.error("[API] Error loading submodule spec:", error);
      return NextResponse.json(
        {
          error: "Failed to load submodule specification",
        },
        { status: 500 },
      );
    }

    console.log("[API] Calling LLM to improve document with missing sections...");

    // Call LLM improve function
    const improvedText = await improveDocument({
      existingDocuments: documents,
      checklist,
      missingRequirements: analysis.missing.requirements,
      coverageMap: analysis.coverageMap,
    });

    console.log(
      `[API] ✅ Document improvement complete (${improvedText.length} chars)`,
    );

    // Convert improved text to DOCX
    console.log("[API] Converting improved text to DOCX format...");
    const docxBuffer = await createDocxBufferFromText(improvedText);

    // Upload to S3
    const timestamp = Date.now();
    const documentId = randomUUID();
    const s3Key = `docs/${orgId}/primus_gfs/improved/${subModuleId}/${documentId}.docx`;

    const docBlob = new Blob([new Uint8Array(docxBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await uploadToS3(docBlob, s3Key);

    console.log(`[API] Uploaded improved document to S3: ${s3Key}`);

    // Parse module and submodule IDs
    const [moduleId] = subModuleId.split(".");
    const subSubModuleId = subModuleId.includes(".") && subModuleId.split(".").length > 2 
      ? subModuleId 
      : null;

    // Store analysis score from compliance_analysis table
    const analysisScore = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;

    // Create or update document record
    const documentResult = await query(
      `INSERT INTO document 
       (id, org_id, framework_id, module_id, sub_module_id, sub_sub_module_id, 
        title, status, content_key, current_version, analysis_score, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id) 
       DO UPDATE SET 
         content_key = EXCLUDED.content_key, 
         current_version = document.current_version + 1, 
         analysis_score = EXCLUDED.analysis_score,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id`,
      [
        documentId,
        orgId,
        "primus_gfs",
        moduleId,
        subModuleCode,
        subSubModuleId,
        `Improved Evidence - ${subModuleId}`,
        "draft",
        s3Key,
        1,
        JSON.stringify(analysisScore),
        userId,
        userId,
      ],
    );

    const finalDocId = documentResult.rows[0].id;

    // Create document_source entry for audit trail
    await query(
      `INSERT INTO document_source 
       (document_id, analysis_id, evidence_ids, generation_type, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        finalDocId,
        analysisId,
        JSON.stringify(evidenceFiles.map((e) => e.id)),
        "improved",
        userId,
      ],
    );

    console.log(`[API] ✅ Created document record: ${finalDocId}`);

    return NextResponse.json({
      success: true,
      documentId: finalDocId,
      fileKey: s3Key,
      fileName: `improved_${subModuleId}.docx`,
      fileSize: docxBuffer.length,
      evidenceCount: evidenceFiles.length,
      analysisId,
      message: "Document improved with AI-generated sections and attached to document table",
    });
  } catch (error) {
    console.error("[API] Error improving document:", error);

    return NextResponse.json(
      {
        error: "Failed to improve document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
