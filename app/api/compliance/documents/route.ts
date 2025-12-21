/**
 * GET /api/compliance/documents?subModuleId={code}
 *
 * Retrieve all documents for a specific sub-module.
 * Used to display document status and history in the UI.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { getDocumentsBySubModule } from "@/lib/primus/db-helper";

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = authContext;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const subModuleId = searchParams.get("subModuleId");
    const moduleId = searchParams.get("moduleId");
    const frameworkId = searchParams.get("frameworkId") || "primus_gfs";

    if (!subModuleId || !moduleId) {
      return NextResponse.json(
        { error: "subModuleId and moduleId are required" },
        { status: 400 },
      );
    }

    // Parse sub-module code to handle sub-sub-modules
    // e.g., "4.04.01" -> module: "4", subModule: "4.04"
    const codeParts = subModuleId.split(".");
    const actualSubModuleId =
      codeParts.length === 3 ? `${codeParts[0]}.${codeParts[1]}` : subModuleId;

    // Fetch documents
    const documents = await getDocumentsBySubModule(
      orgId,
      frameworkId,
      moduleId,
      actualSubModuleId,
    );

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    console.error("[API] Error fetching documents:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch documents",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
