/**
 * POST /api/compliance/analyze
 * FULL ANALYSIS: Comprehensive compliance analysis of uploaded evidence
 * Uses analyzeCompliance() for detailed assessment
 *
 * Request Body:
 * {
 *   "subModuleId": "clx..."
 * }
 *
 * Process:
 * 1. Fetch all UploadedEvidence for subModuleId (max 3)
 * 2. Fetch SubModule checklist
 * 3. Download extracted texts from S3
 * 4. Call LLM with FULL ANALYSIS prompts (4 phases)
 * 5. Save complete analysis to database
 * 6. Return all analysis data
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { query } from "@/lib/db/postgres";
import { getFromS3 } from "@/lib/s3-utils";
import { analyzeCompliance } from "@/lib/llm-analysis";
import { loadSubmoduleSpec } from "@/server/primus/loader";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes - Vercel hobby plan max

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId, userId } = authContext;
    const { subModuleId } = (await request.json()) as { subModuleId: string };

    if (!subModuleId) {
      return NextResponse.json(
        { error: "subModuleId is required" },
        { status: 400 },
      );
    }

    console.log("[API] Starting compliance analysis:", {
      orgId,
      userId,
      subModuleId,
    });

    // Parse subModuleId to get moduleNumber and code
    // Handle sub-sub-modules (e.g., "4.04.01" -> module: "4", subModule: "4.04")
    const codeParts = subModuleId.split(".");
    const moduleNumber = codeParts[0];
    const isSubSubModule = codeParts.length === 3;
    const subModuleCode = isSubSubModule
      ? `${codeParts[0]}.${codeParts[1]}`
      : subModuleId;

    // Fetch uploaded evidence
    const evidenceResult = await query(
      `SELECT id, filename, extracted_text_key FROM uploaded_evidence 
       WHERE org_id = $1 AND sub_module_id = $2 AND deleted_at IS NULL
       ORDER BY uploaded_at ASC
       LIMIT 3`,
      [orgId, subModuleId],
    );

    const evidenceFiles = evidenceResult.rows;

    if (evidenceFiles.length === 0) {
      return NextResponse.json(
        {
          error: "No evidence files found",
          details: "Please upload evidence documents first",
        },
        { status: 400 },
      );
    }

    console.log(`[API] Found ${evidenceFiles.length} evidence file(s)`);

    // Download extracted texts from S3
    const documents: { fileName: string; text: string }[] = [];

    for (const evidence of evidenceFiles) {
      try {
        const textBuffer = await getFromS3(evidence.extracted_text_key);
        const text =
          textBuffer instanceof Buffer
            ? textBuffer.toString("utf-8")
            : (textBuffer as string);

        documents.push({
          fileName: evidence.filename,
          text,
        });

        console.log(`[API] Retrieved extracted text for ${evidence.filename}`);
      } catch (error) {
        console.error(
          `[API] Error retrieving text for ${evidence.filename}:`,
          error,
        );
        throw new Error(`Failed to retrieve text for ${evidence.filename}`);
      }
    }

    console.log(`[API] Retrieved ${documents.length} document texts`);

    // Load submodule specification to get requirements AND description
    let checklist: any;
    let subModuleDescription: string = "";
    try {
      const spec = loadSubmoduleSpec(moduleNumber, subModuleCode);
      // Extract requirements from spec
      checklist = spec.requirements || [];
      // Extract description for relevance checking
      subModuleDescription = spec.description || spec.title || subModuleCode;
    } catch (error) {
      console.error("[API] Error loading submodule spec:", error);
      return NextResponse.json(
        {
          error: "Failed to load submodule specification",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }

    console.log("[API] Calling LLM for FULL compliance analysis...");

    // Use full analysis (comprehensive multi-phase analysis)
    const fullAnalysis = await analyzeCompliance({
      checklist,
      documents,
      subModuleDescription,
    });

    console.log("[API] ✅ Full analysis complete:", {
      overallScore: fullAnalysis.overallScore,
      contentScore: fullAnalysis.contentScore,
      structureScore: fullAnalysis.structureScore,
      auditReadinessScore: fullAnalysis.auditReadinessScore,
      contentCoverageCount: fullAnalysis.contentCoverage?.length || 0,
    });

    // Create analysisId for this analysis
    const analysisId = randomUUID();

    // Save full analysis to database
    console.log("[API] Saving full analysis to database...");
    await query(
      `INSERT INTO compliance_analysis 
       (id, org_id, sub_module_id, evidence_ids, overall_score, analysis_result, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        analysisId,
        orgId,
        subModuleId,
        JSON.stringify(evidenceFiles.map((e) => e.id)),
        fullAnalysis.overallScore,
        JSON.stringify(fullAnalysis),
        userId,
        new Date().toISOString(),
      ],
    );
    console.log(`[API] ✅ Full analysis saved: ${analysisId}`);

    // Return full analysis data to user
    // Frontend will display only 4 scores on results page
    // Full detailed analysis available for other screens

    return NextResponse.json(
      {
        success: true,
        analysisId,
        analysis: fullAnalysis, // Return complete analysis
        message: "Compliance analysis completed successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error in compliance analysis:", error);

    return NextResponse.json(
      {
        error: "Failed to analyze compliance",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
