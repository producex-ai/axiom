/**
 * POST /api/compliance/documents/[id]/validate-audit
 *
 * Validates document audit readiness using comprehensive LLM analysis.
 * Reuses the analyzeCompliance() logic from upload flow.
 *
 * Request Body:
 * {
 *   "content": "markdown content...",
 *   "title": "document title"
 * }
 *
 * Returns:
 * {
 *   "highRiskIssues": [...],
 *   "auditReadinessScore": number,
 *   "summary": string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/primus/auth-helper";
import { getDocumentById } from "@/lib/primus/db-helper";
import { analyzeCompliance } from "@/lib/ai/llm-analysis";
import { loadSubmoduleSpec } from "@/server/primus/loader";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes - Vercel hobby plan max

export async function POST(
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

    const { content, title } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required and must be a string" },
        { status: 400 },
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 },
      );
    }

    // Fetch document
    const document = await getDocumentById(id, orgId);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    console.log(`[API] Starting audit validation for document ${id}`);

    // Load submodule spec for audit analysis
    let checklist: any = null;
    let subModuleDescription = title;

    // If document is linked to a module, we MUST load its spec for proper audit validation
    if (document.module_id && document.sub_module_id) {
      try {
        const moduleNumber = document.module_id;
        const submoduleCode = document.sub_module_id;
        const spec = loadSubmoduleSpec(moduleNumber, submoduleCode);
        checklist = spec.requirements || [];
        subModuleDescription = spec.description || spec.title || title;
      } catch (error) {
        return NextResponse.json(
          {
            error: "Cannot validate audit readiness",
            details: `Submodule specification not found for ${document.module_id}.${document.sub_module_id}. Audit validation requires the module spec to validate against requirements.`,
          },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error: "Cannot validate audit readiness",
          details:
            "Document is not linked to a compliance module. Audit validation requires a module assignment to validate against requirements.",
        },
        { status: 400 },
      );
    }

    // Prepare documents array for analysis
    const documents = [{ fileName: title, text: content }];

    // Run comprehensive analysis
    const analysis = await analyzeCompliance({
      checklist: checklist || [],
      documents,
      subModuleDescription,
    });

    console.log("[API] ✅ Audit analysis complete:", {
      auditReadinessScore: analysis.auditReadiness?.score || 0,
      overallScore: analysis.overallScore,
    });

    // Extract high-risk issues from audit readiness assessment
    const highRiskIssues: any[] = [];

    // Check audit readiness status
    if (analysis.auditReadiness?.overallAuditReadiness === "not-ready") {
      highRiskIssues.push({
        description:
          "Document audit readiness: NOT READY. Critical issues must be resolved.",
        severity: "HIGH",
        remediation:
          analysis.auditReadiness.auditRisks?.[0] ||
          "Address critical compliance gaps",
        category: "audit-readiness",
      });
    } else if (
      analysis.auditReadiness?.overallAuditReadiness === "major-revisions"
    ) {
      highRiskIssues.push({
        description:
          "Document requires major revisions to meet audit standards.",
        severity: "HIGH",
        remediation: "Review and implement recommended major revisions.",
        category: "audit-readiness",
      });
    }

    // Add critical missing requirements
    if (
      analysis.missing &&
      "requirements" in analysis.missing &&
      Array.isArray(analysis.missing.requirements)
    ) {
      const criticalMissing = analysis.missing.requirements
        .slice(0, 3)
        .map((r: any) => r.title); // Top 3 missing
      highRiskIssues.push({
        description: `Missing critical requirements: ${criticalMissing.join(", ")}`,
        severity: "HIGH",
        remediation:
          "Include all required elements: " + criticalMissing.join(", "),
        category: "missing-requirements",
      });
    }

    // Add structural issues if present
    if (
      analysis.structuralAnalysis?.overallStructureQuality ===
      "needs-improvement"
    ) {
      const missingElements =
        analysis.structuralAnalysis.missingStructuralElements || [];
      if (missingElements.length > 0) {
        highRiskIssues.push({
          description: `Structural issues: ${missingElements.slice(0, 2).join(", ")}`,
          severity: "HIGH",
          remediation:
            "Ensure proper document structure with all required sections.",
          category: "document-structure",
        });
      }
    }

    // Determine if audit ready
    const isAuditReady =
      highRiskIssues.length === 0 &&
      analysis.auditReadiness?.overallAuditReadiness !== "not-ready" &&
      analysis.auditReadiness?.overallAuditReadiness !== "major-revisions";

    const auditReadinessScore =
      analysis.auditReadiness?.score || Math.round(analysis.overallScore * 0.8); // Fallback to 80% of overall score

    console.log(`[API] Audit validation result:`, {
      isAuditReady,
      highRiskIssuesCount: highRiskIssues.length,
      score: auditReadinessScore,
    });

    return NextResponse.json(
      {
        highRiskIssues,
        auditReadinessScore,
        isAuditReady,
        summary: isAuditReady
          ? "Document is audit ready for publication"
          : `Document has ${highRiskIssues.length} high-risk issue(s) blocking publication`,
        // Return full detailed analysis for advanced features
        fullAnalysis: analysis,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error validating audit readiness:", error);
    return NextResponse.json(
      {
        error: "Failed to validate audit readiness",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
