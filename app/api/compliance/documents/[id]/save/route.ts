/**
 * PATCH /api/compliance/documents/[id]/save
 * Save document without versioning or re-analysis
 * Does NOT increment version number - only updates content
 * Creates revision record for audit trail
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { convertMarkdownToDocx } from "@/lib/document-converters";
import { getAuthContext } from "@/lib/primus/auth-helper";
import {
  createDocumentRevision,
  getDocumentById,
} from "@/lib/primus/db-helper";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

/**
 * PATCH - Save document without versioning
 */
export async function PATCH(
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
    const { id } = await params;

    // Parse request body
    const { content, analysisScore = null } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'content' field" },
        { status: 400 },
      );
    }

    // Fetch document metadata
    const document = await getDocumentById(id, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    console.log(`[API] Saving document ${id} without version increment`);

    // Convert Markdown to DOCX
    const docxBuffer = await convertMarkdownToDocx(content, document.title);

    // Use current version (no increment)
    const currentVersion = document.current_version;
    const timestamp = Date.now();
    const pathParts = document.content_key.split("/");
    const basePath = pathParts.slice(0, -1).join("/");
    const newS3Key = `${basePath}/v${currentVersion}_${timestamp}.docx`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: newS3Key,
      Body: docxBuffer,
      ContentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await s3.send(putCommand);

    console.log(`[API] ✅ Uploaded to S3: ${newS3Key}`);

    // Update document in database - keep current version and status
    // Include analysis_score if provided
    if (analysisScore) {
      await query(
        `UPDATE document 
         SET content_key = $1, 
             updated_by = $2, 
             analysis_score = $3,
             updated_at = NOW()
         WHERE id = $4 AND org_id = $5`,
        [newS3Key, userId, JSON.stringify(analysisScore), id, orgId],
      );
    } else {
      await query(
        `UPDATE document 
         SET content_key = $1, 
             updated_by = $2, 
             updated_at = NOW()
         WHERE id = $3 AND org_id = $4`,
        [newS3Key, userId, id, orgId],
      );
    }

    console.log(`[API] ✅ Document saved (version ${currentVersion})`);

    // Note: We do NOT create a revision record here because the version hasn't changed.
    // Revision records are only created when version increments (on publish).
    // This prevents duplicate key violations on the (document_id, version) unique constraint.

    return NextResponse.json({
      success: true,
      message: "Document saved successfully",
      version: currentVersion,
      status: document.status,
      contentKey: newS3Key,
    });
  } catch (error) {
    console.error("[API] Error saving document content:", error);
    return NextResponse.json(
      {
        error: "Failed to save document content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
