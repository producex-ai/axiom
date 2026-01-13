/**
 * GET /api/compliance/documents/[id]/content
 * Fetch document content from S3 and convert to Markdown for editing
 *
 * PUT /api/compliance/documents/[id]/content
 * Save edited Markdown content, convert to DOCX, and upload to S3
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import {
  convertDocxToMarkdown,
  convertMarkdownToDocx,
} from "@/lib/document-converters";
import { getAuthContext } from "@/lib/primus/auth-helper";
import {
  createDocumentRevision,
  getDocumentById,
} from "@/lib/primus/db-helper";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

/**
 * GET - Fetch document content as Markdown
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
    const { id } = await params;

    // Fetch document metadata
    const document = await getDocumentById(id, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    console.log(
      `[API] Fetching content for document ${id} from S3: ${document.content_key}`,
    );

    // Fetch DOCX from S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: document.content_key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("No content in S3 response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - Body is a readable stream
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const docxBuffer = Buffer.concat(chunks);

    // Convert DOCX to Markdown, passing title to strip it from content
    const markdown = await convertDocxToMarkdown(docxBuffer, document.title);

    console.log(
      `[API] ✅ Document content converted to Markdown (${markdown.length} chars)`,
    );

    return NextResponse.json({
      success: true,
      content: markdown,
      contentType: "text/markdown",
      metadata: {
        id: document.id,
        title: document.title,
        status: document.status,
        version: document.current_version,
        moduleId: document.module_id,
        subModuleId: document.sub_module_id,
        subSubModuleId: document.sub_sub_module_id,
        createdBy: document.created_by,
        updatedBy: document.updated_by,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        analysisScore: document.analysis_score, // Include stored analysis results
        publishedAt: document.published_at,
        renewal: document.renewal,
        docType: document.doc_type,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching document content:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch document content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT - Publish document
 * Converts edited Markdown content to DOCX and uploads to S3
 * Updates document status to published in database
 * Increments version number
 */
export async function PUT(
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
    const {
      content,
      status = "published",
      analysisScore = null,
    } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'content' field" },
        { status: 400 },
      );
    }

    // Validate status
    if (!["draft", "published"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'draft' or 'published'" },
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

    console.log(
      `[API] ${status === "published" ? "Publishing" : "Saving draft for"} document ${id}`,
    );

    // Convert Markdown to DOCX
    const docxBuffer = await convertMarkdownToDocx(content, document.title);

    // Generate new S3 key with incremented version
    const newVersion = document.current_version + 1;
    const timestamp = Date.now();
    const pathParts = document.content_key.split("/");
    const fileName = pathParts[pathParts.length - 1];
    const basePath = pathParts.slice(0, -1).join("/");
    const newS3Key = `${basePath}/v${newVersion}_${timestamp}.docx`;

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

    // Update document in database with provided status
    const newStatus = status;

    // Build update query - include analysis_score if provided (only on publish)
    if (analysisScore && status === "published") {
      await query(
        `UPDATE document 
         SET content_key = $1, 
             current_version = $2, 
             status = $3,
             analysis_score = $4,
             published_at = $5,
             updated_by = $6, 
             updated_at = NOW()
         WHERE id = $7 AND org_id = $8`,
        [
          newS3Key,
          newVersion,
          newStatus,
          JSON.stringify(analysisScore),
          new Date().toISOString(),
          userId,
          id,
          orgId,
        ],
      );
    } else if (status === "published") {
      // Published without analysis score (for non-compliance documents)
      await query(
        `UPDATE document 
         SET content_key = $1, 
             current_version = $2, 
             status = $3,
             published_at = $4,
             updated_by = $5, 
             updated_at = NOW()
         WHERE id = $6 AND org_id = $7`,
        [
          newS3Key,
          newVersion,
          newStatus,
          new Date().toISOString(),
          userId,
          id,
          orgId,
        ],
      );
    } else {
      await query(
        `UPDATE document 
         SET content_key = $1, 
             current_version = $2, 
             status = $3,
             updated_by = $4, 
             updated_at = NOW()
         WHERE id = $5 AND org_id = $6`,
        [newS3Key, newVersion, newStatus, userId, id, orgId],
      );
    }

    console.log(`[API] ✅ Document ${newStatus} (version ${newVersion})`);

    // Determine action based on status
    const action = status === "published" ? "published" : "edited";

    // Create revision record
    await createDocumentRevision(
      id,
      orgId,
      newVersion,
      action,
      newS3Key,
      newStatus,
      userId,
      status === "published" ? "Document published" : "Draft saved",
    );

    console.log(
      `[API] ✅ Revision record created for document ${id} (action: published)`,
    );

    return NextResponse.json({
      success: true,
      message:
        status === "published"
          ? "Document published successfully"
          : "Draft saved successfully",
      version: newVersion,
      status: newStatus,
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
