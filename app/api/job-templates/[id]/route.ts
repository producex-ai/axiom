import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as jobTemplateService from "@/lib/services/jobTemplateService";

/**
 * GET /api/job-templates/[id]
 * Get single job template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const template = await jobTemplateService.getTemplateById(id, userId);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching job template:", error);
    return NextResponse.json(
      { error: "Failed to fetch job template" },
      { status: 500 }
    );
  }
}
