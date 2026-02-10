import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as jobService from "@/lib/services/jobService";
import { JobStatus } from "@/lib/validators/jobValidators";

/**
 * GET /api/jobs
 * Get all jobs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as JobStatus | null;
    const assigned_to = searchParams.get("assigned_to");
    const template_id = searchParams.get("template_id");

    // Get jobs with status
    let jobs = await jobService.getJobsWithStatus(
      userId,
      status || undefined
    );

    // Apply additional filters if needed
    if (assigned_to) {
      jobs = jobs.filter((j) => j.assigned_to === assigned_to);
    }

    if (template_id) {
      jobs = jobs.filter((j) => j.template_id === template_id);
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
