/**
 * GET /api/compliance/documents/[id]/revisions/[revisionId]/download
 * Download a specific revision version of a compliance document from S3
 *
 * Returns: Document file as blob
 */

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { getDocumentById } from "@/lib/primus/db-helper";
import { query } from "@/lib/db/postgres";

export const runtime = "nodejs";

const s3 = new S3Client({ region: process.env.AWS_REGION! });

interface DocumentRevision {
  id: string;
  document_id: string;
  org_id: string;
  version: number;
  content_key: string;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;
    const { id: documentId, revisionId } = await params;

    // Verify document access
    const document = await getDocumentById(documentId, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    console.log(
      `[API] Fetching revision ${revisionId} for document ${documentId}`,
    );

    // Fetch the specific revision
    const result = await query<DocumentRevision>(
      `SELECT id, document_id, org_id, version, content_key, created_at
       FROM document_revision 
       WHERE id = $1 AND document_id = $2 AND org_id = $3
       LIMIT 1`,
      [revisionId, documentId, orgId],
    );

    const revision = result.rows[0];

    if (!revision) {
      return NextResponse.json(
        { error: "Revision not found" },
        { status: 404 },
      );
    }

    const key = revision.content_key;

    console.log(`[API] Downloading revision document from S3: ${key}`);

    // Fetch the document from S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error("No content in S3 response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    console.log(
      `[API] ✅ Revision document downloaded successfully (${buffer.length} bytes)`,
    );

    // Create filename with version number
    const baseFilename = document.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const filename = `${baseFilename}_v${revision.version}.docx`;

    // Return the file as a downloadable response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          response.ContentType ||
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] Error downloading revision document:", error);

    return NextResponse.json(
      {
        error: "Failed to download revision document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
