/**
 * POST /api/compliance/accept
 * Accept and attach a single uploaded document without modifications
 * 
 * Creates/updates a document in the main "document" table with the uploaded content as-is.
 *
 * Request Body:
 * {
 *   "subModuleId": "clx...",
 *   "analysisId": "clx..."
 * }
 *
 * Process:
 * 1. Fetch the single evidence document
 * 2. Download extracted text from S3
 * 3. Convert to DOCX format
 * 4. Upload to S3
 * 5. Create/Update document record (unified table)
 * 6. Create document_source entry (audit trail)
 * 7. Return document info
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";
import { getFromS3, uploadToS3 } from "@/lib/s3-utils";
import { createDocxBufferFromText } from "@/server/docgen";
import { createDocumentRevision } from "@/lib/primus/db-helper";
import { loadSubmoduleSpec } from "@/server/primus/loader";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;
    const { subModuleId, analysisId, renewal, docType } = (await request.json()) as {
      subModuleId: string;
      analysisId: string;
      renewal?: string;
      docType?: string;
    };

    if (!subModuleId || !analysisId) {
      return NextResponse.json(
        {
          error: "subModuleId and analysisId are required",
        },
        { status: 400 },
      );
    }

    console.log("[API] Starting document acceptance:", {
      orgId,
      userId,
      subModuleId,
      analysisId,
    });

    // Parse subModuleId to get moduleNumber and code
    const [moduleNumber] = subModuleId.split(".");
    const subModuleCode = subModuleId;

    // Load submodule spec to get title
    let submoduleTitle: string;
    try {
      const spec = loadSubmoduleSpec(moduleNumber, subModuleCode);
      submoduleTitle = spec.title;
    } catch (error) {
      console.error("[API] Error loading submodule spec:", error);
      return NextResponse.json(
        {
          error: "Failed to load submodule specification",
        },
        { status: 500 },
      );
    }

    // Fetch the compliance analysis result to store with document
    const analysisResult = await query(
      `SELECT analysis_result FROM compliance_analysis 
       WHERE id = $1 AND org_id = $2`,
      [analysisId, orgId],
    );

    let analysisScore = null;
    if (analysisResult.rows.length > 0) {
      const analysisData = analysisResult.rows[0].analysis_result;
      analysisScore = typeof analysisData === 'string' ? JSON.parse(analysisData) : analysisData;
      console.log("[API] Retrieved compliance analysis for document");
    }

    // Fetch the single evidence document
    const evidenceResult = await query(
      `SELECT id, filename, extracted_text_key FROM uploaded_evidence 
       WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
       ORDER BY uploaded_at ASC
       LIMIT 1`,
      [orgId, subModuleId],
    );

    if (evidenceResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No evidence file found",
          details: "Please upload an evidence document first",
        },
        { status: 400 },
      );
    }

    const evidenceFile = evidenceResult.rows[0];

    console.log(`[API] Found evidence file: ${evidenceFile.filename}`);

    // Download extracted text from S3
    let documentText: string;
    try {
      const textBuffer = await getFromS3(evidenceFile.extracted_text_key);
      documentText =
        textBuffer instanceof Buffer
          ? textBuffer.toString("utf-8")
          : (textBuffer as string);

      console.log(
        `[API] Retrieved text from S3 (${documentText.length} chars)`,
      );
    } catch (error) {
      console.error(
        `[API] Error retrieving text for ${evidenceFile.filename}:`,
        error,
      );
      throw new Error(
        `Failed to retrieve text for ${evidenceFile.filename}`,
      );
    }

    // Convert to DOCX
    console.log("[API] Converting document to DOCX format...");
    const docxBuffer = await createDocxBufferFromText(documentText);

    // Upload to S3
    const timestamp = Date.now();
    const documentId = randomUUID();
    const s3Key = `docs/${orgId}/primus_gfs/accepted/${subModuleId}/${documentId}.docx`;

    const docBlob = new Blob([new Uint8Array(docxBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await uploadToS3(docBlob, s3Key);

    console.log(`[API] Uploaded accepted document to S3: ${s3Key}`);

    // Parse module and submodule IDs
    const [moduleId] = subModuleId.split(".");
    const subSubModuleId =
      subModuleId.includes(".") && subModuleId.split(".").length > 2
        ? subModuleId
        : null;

    // Create or update document record
    const documentResult = await query(
      `INSERT INTO document 
       (id, org_id, framework_id, module_id, sub_module_id, sub_sub_module_id, 
        title, status, content_key, current_version, analysis_score, renewal, doc_type, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id) 
       DO UPDATE SET 
         content_key = EXCLUDED.content_key, 
         current_version = document.current_version + 1, 
         analysis_score = EXCLUDED.analysis_score,
         renewal = EXCLUDED.renewal,
         doc_type = EXCLUDED.doc_type,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, current_version`,
      [
        documentId,
        orgId,
        "primus_gfs",
        moduleId,
        subModuleId,
        subSubModuleId,
        submoduleTitle,
        "draft",
        s3Key,
        1,
        analysisScore ? JSON.stringify(analysisScore) : null,
        renewal || null,
        docType || null,
        userId,
        userId,
      ],
    );

    const finalDocId = documentResult.rows[0].id;
    const currentVersion = documentResult.rows[0].current_version;

    // Create document_source entry for audit trail
    await query(
      `INSERT INTO document_source 
       (document_id, analysis_id, evidence_ids, generation_type, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        finalDocId,
        analysisId,
        JSON.stringify([evidenceFile.id]),
        "merged",
        userId,
      ],
    );

    // Create revision record for accept
    await createDocumentRevision(
      finalDocId,
      orgId,
      currentVersion,
      "created",
      s3Key,
      "draft",
      userId,
      `Document accepted from evidence: ${evidenceFile.filename}`,
    );

    console.log(`[API] ✅ Created document record: ${finalDocId}`);

    return NextResponse.json({
      success: true,
      documentId: finalDocId,
      fileKey: s3Key,
      fileName: `accepted_${subModuleId}.docx`,
      fileSize: docxBuffer.length,
      evidenceCount: 1,
      analysisId,
      message: "Document accepted and attached to module",
    });
  } catch (error) {
    console.error("[API] Error accepting document:", error);

    return NextResponse.json(
      {
        error: "Failed to accept document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
