/**
 * GET /api/evidence
 * Fetch uploaded evidence for a sub-module
 *
 * Query Params:
 * - subModuleId (required): string
 *
 * Returns:
 * - evidence: Array of uploaded evidence files
 * - maxAllowed: Maximum evidence files allowed (3)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;
    const subModuleId = request.nextUrl.searchParams.get("subModuleId");

    if (!subModuleId) {
      return NextResponse.json(
        { error: "subModuleId is required" },
        { status: 400 },
      );
    }

    // Query evidence files from database
    const result = await query(
      `SELECT id, filename, file_key, file_size, uploaded_at, uploaded_by
       FROM uploaded_evidence
       WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
       ORDER BY uploaded_at DESC`,
      [orgId, subModuleId],
    );

    const evidence = result.rows.map((row: any) => ({
      id: row.id,
      fileName: row.filename,
      fileKey: row.file_key,
      fileSize: row.file_size,
      uploadedAt: row.uploaded_at,
      uploadedBy: row.uploaded_by,
    }));

    return NextResponse.json(
      {
        evidence,
        maxAllowed: 3,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error fetching evidence:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch evidence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
