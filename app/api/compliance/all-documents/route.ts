/**
 * GET /api/compliance/all-documents
 * Fetch all documents for the organization
 *
 * Returns: Array of documents with metadata
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;

    // Fetch all documents for the org (both compliance and company documents)
    const result = await query(
      `SELECT * FROM document 
       WHERE org_id = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [orgId],
    );

    const documents = result.rows;

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("[API] Error fetching all documents:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
