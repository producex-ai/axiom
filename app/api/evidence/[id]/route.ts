/**
 * DELETE /api/evidence/[id]
 * Delete an uploaded evidence document
 *
 * Path Params:
 * - id: evidence ID
 *
 * Process:
 * 1. Get evidence record
 * 2. Delete from S3 (both original and extracted text)
 * 3. Delete from database (soft delete)
 * 4. Check if any analyses reference this evidence → mark as stale
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Evidence deleted"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";
import { deleteFromS3 } from "@/lib/s3-utils";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Evidence ID is required" },
        { status: 400 },
      );
    }

    console.log("[API] Deleting evidence:", { orgId, evidenceId: id });

    // Get evidence record
    const result = await query(
      `SELECT id, file_key, extracted_text_key FROM uploaded_evidence 
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [id, orgId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Evidence not found" },
        { status: 404 },
      );
    }

    const evidence = result.rows[0];

    // Delete from S3 (both original and extracted)
    try {
      await deleteFromS3(evidence.file_key);
      console.log(`[API] Deleted S3 file: ${evidence.file_key}`);

      if (evidence.extracted_text_key) {
        await deleteFromS3(evidence.extracted_text_key);
        console.log(
          `[API] Deleted extracted text: ${evidence.extracted_text_key}`,
        );
      }
    } catch (s3Error) {
      console.error("[API] S3 deletion error:", s3Error);
      // Continue even if S3 deletion fails - database will still be updated
    }

    // Soft delete from database
    await query(`UPDATE uploaded_evidence SET deleted_at = $1 WHERE id = $2`, [
      new Date().toISOString(),
      id,
    ]);

    console.log(`[API] ✅ Evidence deleted successfully: ${id}`);

    // TODO: Mark analyses as stale if they reference this evidence
    // This would be part of a more complex workflow

    return NextResponse.json(
      {
        success: true,
        message: "Evidence deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error deleting evidence:", error);

    return NextResponse.json(
      {
        error: "Failed to delete evidence",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
