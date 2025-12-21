/**
 * POST /api/submodule/[id]/attach
 * Attach a generated document to SubModule (final document)
 *
 * Path Params:
 * - id: subModuleId
 *
 * Request Body:
 * {
 *   "generatedDocId": "clx..."
 * }
 *
 * Process:
 * 1. Validate generatedDocId belongs to this subModuleId
 * 2. Fetch GeneratedDocument
 * 3. Update SubModule:
 *    - Set finalDocId = generatedDocId
 *    - Set documentStatus = "ready"
 *    - Set updatedAt = now
 * 4. Archive previous attached document (if exists)
 * 5. Return updated SubModule info
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;
    const { id: subModuleId } = await params;
    const { generatedDocId } = (await request.json()) as {
      generatedDocId: string;
    };

    if (!subModuleId || !generatedDocId) {
      return NextResponse.json(
        {
          error: "subModuleId and generatedDocId are required",
        },
        { status: 400 },
      );
    }

    console.log("[API] Attaching document to submodule:", {
      orgId,
      userId,
      subModuleId,
      generatedDocId,
    });

    // Validate that the document belongs to this submodule and org
    const docResult = await query(
      `SELECT id, sub_module_id FROM document 
       WHERE id = $1 AND org_id = $2 AND sub_module_id = $3`,
      [generatedDocId, orgId, subModuleId],
    );

    if (docResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Document not found or does not belong to this submodule",
        },
        { status: 404 },
      );
    }

    console.log(
      `[API] Validated generated document: ${generatedDocId}`,
    );

    // Start transaction: Get current final doc (if any) to archive
    const currentResult = await query(
      `SELECT final_doc_id FROM submodule_state 
       WHERE org_id = $1 AND sub_module_id = $2`,
      [orgId, subModuleId],
    );

    let previousFinalDocId: string | null = null;
    if (currentResult.rows.length > 0) {
      previousFinalDocId = currentResult.rows[0].final_doc_id;
    }

    // Update submodule state to attach the document
    const now = new Date().toISOString();

    if (currentResult.rows.length > 0) {
      // Update existing record
      await query(
        `UPDATE submodule_state 
         SET final_doc_id = $1, document_status = $2, updated_at = $3, updated_by = $4
         WHERE org_id = $5 AND sub_module_id = $6`,
        [
          generatedDocId,
          "ready",
          now,
          userId,
          orgId,
          subModuleId,
        ],
      );
    } else {
      // Create new record
      await query(
        `INSERT INTO submodule_state 
         (org_id, sub_module_id, final_doc_id, document_status, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orgId,
          subModuleId,
          generatedDocId,
          "ready",
          now,
          userId,
        ],
      );
    }

    console.log(`[API] ✅ Document attached to submodule: ${generatedDocId}`);

    // Archive previous document if it exists
    if (previousFinalDocId) {
      try {
        await query(
          `UPDATE generated_document 
           SET archived_at = $1 
           WHERE id = $2 AND org_id = $3`,
          [now, previousFinalDocId, orgId],
        );

        console.log(
          `[API] Archived previous document: ${previousFinalDocId}`,
        );
      } catch (error) {
        console.error("[API] Error archiving previous document:", error);
        // Continue even if archiving fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        subModuleId,
        finalDocId: generatedDocId,
        documentStatus: "ready",
        updatedAt: now,
        message: "Document attached successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error attaching document:", error);

    return NextResponse.json(
      {
        error: "Failed to attach document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
