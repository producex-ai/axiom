/**
 * PATCH /api/compliance/documents/[id]/analysis-score
 * Update document analysis score without affecting version or content
 */

import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/postgres";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { getDocumentById } from "@/lib/primus/db-helper";

/**
 * PATCH - Update analysis score only
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

    const { orgId } = authContext;
    const { id } = await params;

    // Parse request body
    const { analysisScore } = await request.json();

    if (!analysisScore) {
      return NextResponse.json(
        { error: "Missing 'analysisScore' field" },
        { status: 400 },
      );
    }

    // Fetch document metadata to verify it exists
    const document = await getDocumentById(id, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    console.log(`[API] Updating analysis score for document ${id}`);

    // Update only the analysis_score field
    await query(
      `UPDATE document 
       SET analysis_score = $1, 
           updated_at = NOW()
       WHERE id = $2 AND org_id = $3`,
      [JSON.stringify(analysisScore), id, orgId],
    );

    console.log(`[API] ✅ Analysis score updated for document ${id}`);

    return NextResponse.json({
      success: true,
      message: "Analysis score updated successfully",
    });
  } catch (error) {
    console.error("[API] Error updating analysis score:", error);
    return NextResponse.json(
      {
        error: "Failed to update analysis score",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
