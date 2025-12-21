/**
 * GET /api/compliance/documents/[id]/history
 * Retrieve the complete revision history of a document
 *
 * Returns all revisions in chronological order (latest first)
 * with action, user, timestamp, and status information
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { getDocumentById, getDocumentRevisions } from "@/lib/primus/db-helper";

/**
 * GET - Fetch document revision history
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

    // Fetch document to verify access
    const document = await getDocumentById(id, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    console.log(`[API] Fetching revision history for document ${id}`);

    // Fetch revision history
    const revisions = await getDocumentRevisions(id, orgId);

    console.log(
      `[API] ✅ Retrieved ${revisions.length} revisions for document ${id}`,
    );

    return NextResponse.json({
      success: true,
      documentId: id,
      documentTitle: document.title,
      totalRevisions: revisions.length,
      revisions: revisions.map((rev) => ({
        id: rev.id,
        version: rev.version,
        action: rev.action,
        status: rev.status,
        userId: rev.user_id,
        contentKey: rev.content_key,
        notes: rev.notes,
        createdAt: rev.created_at,
      })),
    });
  } catch (error) {
    console.error("[API] Error fetching document history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch document history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
