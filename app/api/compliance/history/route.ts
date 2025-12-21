/**
 * GET /api/compliance/history
 * Get compliance analysis history for a sub-module
 *
 * Query Params:
 * - subModuleId (required): string
 *
 * Response:
 * {
 *   "analyses": [
 *     {
 *       "id": "clx...",
 *       "createdAt": "2024-01-15T11:45:00Z",
 *       "createdBy": "user@example.com",
 *       "overallScore": 82,
 *       "evidenceCount": 2,
 *       "coverage": {
 *         "covered": 18,
 *         "partial": 3,
 *         "missing": 1
 *       },
 *       "summary": "..."
 *     }
 *   ]
 * }
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

    console.log("[API] Fetching compliance analysis history:", {
      orgId,
      subModuleId,
    });

    // Query compliance analyses ordered by most recent first
    const result = await query(
      `SELECT 
        id, 
        overall_score, 
        analysis_result,
        evidence_ids,
        created_by,
        created_at
       FROM compliance_analysis
       WHERE org_id = $1 AND sub_module_id = $2
       ORDER BY created_at DESC
       LIMIT 10`,
      [orgId, subModuleId],
    );

    const analyses = result.rows.map((row: any) => {
      const analysis = JSON.parse(row.analysis_result);
      const evidenceIds = JSON.parse(row.evidence_ids);

      return {
        id: row.id,
        createdAt: row.created_at,
        createdBy: row.created_by,
        overallScore: row.overall_score,
        evidenceCount: evidenceIds.length,
        coverage: {
          covered: analysis.covered.count,
          partial: analysis.partial.count,
          missing: analysis.missing.count,
        },
        summary: `${analysis.covered.count} covered, ${analysis.partial.count} partial, ${analysis.missing.count} missing`,
      };
    });

    console.log(`[API] Found ${analyses.length} analyses`);

    return NextResponse.json(
      {
        analyses,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error fetching compliance history:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch compliance history",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
