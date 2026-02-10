import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as jobTemplateService from "@/lib/services/jobTemplateService";

/**
 * GET /api/job-templates
 * Get all job templates for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");

    let templates;
    if (category) {
      templates = await jobTemplateService.getTemplatesByCategory(
        category,
        userId
      );
    } else {
      templates = await jobTemplateService.getTemplates(userId);
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching job templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch job templates" },
      { status: 500 }
    );
  }
}
