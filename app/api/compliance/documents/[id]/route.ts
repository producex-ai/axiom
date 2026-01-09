/**
 * GET /api/compliance/documents/[id]
 * Retrieve a specific document by ID
 *
 * PATCH /api/compliance/documents/[id]
 * Update document fields (e.g., renewal period)
 *
 * DELETE /api/compliance/documents/[id]
 * Soft delete a document
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { deleteDocument, getDocumentById } from "@/lib/primus/db-helper";
import { query } from "@/lib/db/postgres";

/**
 * GET - Retrieve document by ID
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

    // Fetch document
    const document = await getDocumentById(id, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("[API] Error fetching document:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update document fields (e.g., renewal period)
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
    const body = await request.json();
    const { renewal } = body;

    // Validate renewal period
    const validRenewals = ["quarterly", "semi_annually", "annually", "2_years"];
    if (renewal && !validRenewals.includes(renewal)) {
      return NextResponse.json(
        { error: "Invalid renewal period" },
        { status: 400 },
      );
    }

    // Update document
    const result = await query(
      `UPDATE document 
       SET renewal = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3 AND org_id = $4 AND deleted_at IS NULL
       RETURNING id, renewal, published_at`,
      [renewal || null, userId, id, orgId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Renewal period updated successfully",
      document: result.rows[0],
    });
  } catch (error) {
    console.error("[API] Error updating document:", error);
    return NextResponse.json(
      {
        error: "Failed to update document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Soft delete document
 */
export async function DELETE(
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

    // Soft delete
    const deleted = await deleteDocument(id, orgId, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Document not found or already deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting document:", error);
    return NextResponse.json(
      {
        error: "Failed to delete document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
