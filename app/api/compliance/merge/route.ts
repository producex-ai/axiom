/**
 * POST /api/compliance/merge
 * Merge uploaded documents WITHOUT AI generation
 *
 * Creates/updates a document in the main "document" table with merged content.
 * This is the final destination - merged documents become regular documents.
 *
 * Request Body:
 * {
 *   "subModuleId": "clx...",
 *   "evidenceIds": ["clx1...", "clx2..."]  // optional, use all if not provided
 * }
 *
 * Process:
 * 1. Fetch evidence documents
 * 2. Download extracted texts from S3
 * 3. Call LLM with merge prompt (strict: no generation)
 * 4. Convert merged text to DOCX format
 * 5. Upload to S3
 * 6. Create/Update document record (unified table)
 * 7. Create document_source entry (audit trail)
 * 8. Return document info
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";
import { getFromS3, uploadToS3 } from "@/lib/utils/s3";
import { mergeDocuments } from "@/lib/ai/llm-merge";
import { createDocxBufferFromText } from "@/server/docgen";
import { createDocumentRevision } from "@/lib/primus/db-helper";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;
    const { subModuleId, evidenceIds } = (await request.json()) as {
      subModuleId: string;
      evidenceIds?: string[];
    };

    if (!subModuleId) {
      return NextResponse.json(
        { error: "subModuleId is required" },
        { status: 400 },
      );
    }

    console.log("[API] Starting document merge:", {
      orgId,
      userId,
      subModuleId,
      evidenceIds: evidenceIds?.length || "all",
    });

    // Fetch evidence documents
    let evidenceQuery = `SELECT id, filename, extracted_text_key FROM uploaded_evidence 
                        WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
                        ORDER BY uploaded_at ASC`;
    const queryParams: any[] = [orgId, subModuleId];

    if (evidenceIds && evidenceIds.length > 0) {
      evidenceQuery += ` AND id = ANY($3)`;
      queryParams.push(evidenceIds);
    }

    const evidenceResult = await query(evidenceQuery, queryParams);
    const evidenceFiles = evidenceResult.rows;

    if (evidenceFiles.length === 0) {
      return NextResponse.json(
        {
          error: "No evidence files found",
          details: "Please upload evidence documents first",
        },
        { status: 400 },
      );
    }

    console.log(
      `[API] Found ${evidenceFiles.length} evidence file(s) to merge`,
    );

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

        console.log(`[API] Retrieved text for merge: ${evidence.filename}`);
      } catch (error) {
        console.error(
          `[API] Error retrieving text for ${evidence.filename}:`,
          error,
        );
        throw new Error(`Failed to retrieve text for ${evidence.filename}`);
      }
    }

    console.log("[API] Calling LLM to merge documents...");

    // Call LLM merge function
    const mergedText = await mergeDocuments(documents);

    console.log(
      `[API] ✅ Document merge complete (${mergedText.length} chars)`,
    );

    // Convert merged text to DOCX
    console.log("[API] Converting merged text to DOCX format...");
    const docxBuffer = await createDocxBufferFromText(mergedText);

    // Upload to S3
    const timestamp = Date.now();
    const documentId = randomUUID();
    const s3Key = `docs/${orgId}/primus_gfs/merged/${subModuleId}/${documentId}.docx`;

    const docBlob = new Blob([new Uint8Array(docxBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    await uploadToS3(docBlob, s3Key);

    console.log(`[API] Uploaded merged document to S3: ${s3Key}`);

    // Parse module and submodule IDs
    // subModuleId format can be: "5" (module), "5.12" (submodule), "5.12.01" (sub-submodule)
    const parts = subModuleId.split(".");
    const moduleId = parts[0]; // First part is always module
    const subModuleCode =
      parts.length >= 2 ? `${parts[0]}.${parts[1]}` : subModuleId; // Full code if submodule
    const subSubModuleId = parts.length > 2 ? subModuleId : null; // Only if 3+ parts

    // Create or update document record
    const documentResult = await query(
      `INSERT INTO document 
       (id, org_id, framework_id, module_id, sub_module_id, sub_sub_module_id, 
        title, status, content_key, current_version, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id) 
       DO UPDATE SET 
         content_key = EXCLUDED.content_key, 
         current_version = document.current_version + 1, 
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
        `Merged Evidence - ${subModuleId}`,
        "draft",
        s3Key,
        1,
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
        null,
        JSON.stringify(evidenceFiles.map((e) => e.id)),
        "merged",
        userId,
      ],
    );

    // Create revision record for merge
    await createDocumentRevision(
      finalDocId,
      orgId,
      1, // Start with version 1 for new documents, increment for updates
      "created",
      s3Key,
      "draft",
      userId,
      `Document merged from ${evidenceFiles.length} uploaded document(s)`,
    );

    console.log(`[API] ✅ Created document record: ${finalDocId}`);

    return NextResponse.json({
      success: true,
      documentId: finalDocId,
      fileKey: s3Key,
      fileName: `merged_${subModuleId}.docx`,
      fileSize: docxBuffer.length,
      evidenceCount: evidenceFiles.length,
      message: "Documents merged and attached to document table",
    });
  } catch (error) {
    console.error("[API] Error merging documents:", error);

    return NextResponse.json(
      {
        error: "Failed to merge documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
