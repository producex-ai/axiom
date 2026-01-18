/**
 * Publish Flow Utilities
 *
 * Implements the publish flow with audit-readiness validation:
 * 1. Persist changes (always)
 * 2. Validate audit readiness
 * 3. Conditionally transition state to published
 */

export interface PublishResult {
  success: boolean;
  version?: number;
  status?: string;
  highRiskIssues: AuditRiskIssue[];
  fullAnalysis?: any; // Complete detailed analysis from API
  message: string;
}

export interface AuditRiskIssue {
  description: string;
  severity: "high" | "medium" | "low";
  remediation?: string;
  category?: string;
}

/**
 * Step 1: Persist draft version
 * Always saves changes regardless of audit result
 * Uses /save endpoint to persist without incrementing version
 * Returns current version number
 */
export async function persistDraftVersion(
  documentId: string,
  content: string,
): Promise<{ version: number; contentKey: string }> {
  const response = await fetch(`/api/compliance/documents/${documentId}/save`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to persist draft version");
  }

  const data = await response.json();
  return {
    version: data.version,
    contentKey: data.contentKey,
  };
}

/**
 * Step 2: Validate audit readiness
 * Analyzes content for high-risk compliance issues
 * Returns list of high-risk issues AND full detailed analysis
 */
export async function validateAuditReadiness(
  documentId: string,
  content: string,
  title: string,
): Promise<{ highRiskIssues: AuditRiskIssue[]; fullAnalysis?: any }> {
  const response = await fetch(
    `/api/compliance/documents/${documentId}/validate-audit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, title }),
    },
  );

  if (!response.ok) {
    // If validation fails, default to blocking
    const error = await response.json();
    throw new Error(error.error || "Failed to validate audit readiness");
  }

  const data = await response.json();

  // Filter for only high-risk issues
  const highRiskIssues: AuditRiskIssue[] = (data.highRiskIssues || []).map(
    (issue: any) => ({
      description: issue.description,
      severity: "high" as const,
      remediation: issue.remediation,
      category: issue.category,
    }),
  );

  return {
    highRiskIssues,
    fullAnalysis: data.fullAnalysis,
  };
}

/**
 * Step 3: Finalize publish
 * Transitions document state to published and increments version
 * Uses existing /content endpoint with status: "published"
 * Only called if audit validation passed
 * Stores updated analysis score with document
 */
export async function finalizePublishState(
  documentId: string,
  content: string,
  version: number,
  analysisScore?: any,
  comment?: string,
): Promise<{ status: string; version: number }> {
  const response = await fetch(
    `/api/compliance/documents/${documentId}/content`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        status: "published",
        analysisScore,
        comment,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to finalize publish");
  }

  const data = await response.json();
  return { status: data.status, version: data.version };
}

/**
 * Complete publish flow: Persist → Validate → Conditionally Finalize
 *
 * Flow:
 * 1. Always persist changes (save draft version, increment version, update revision history)
 * 2. Validate audit readiness on persisted content
 * 3. If high-risk issues exist:
 *    - Document remains in draft state
 *    - Return issues for UI to display
 * 4. If no high-risk issues:
 *    - Finalize publish (transition to published state)
 *    - Return success
 */
export async function executePublishFlow(
  documentId: string,
  content: string,
  title: string,
  options?: { skipValidation?: boolean; comment?: string },
): Promise<PublishResult> {
  try {
    // Step 1: ALWAYS persist changes
    console.log("[PublishFlow] Step 1: Persisting draft version...");
    const { version } = await persistDraftVersion(documentId, content);
    console.log(`[PublishFlow] ✅ Draft version ${version} persisted`);

    // Step 2: Validate audit readiness (unless skipped)
    if (!options?.skipValidation) {
      console.log("[PublishFlow] Step 2: Validating audit readiness...");
      const { highRiskIssues, fullAnalysis } = await validateAuditReadiness(
        documentId,
        content,
        title,
      );
      console.log(
        `[PublishFlow] Audit validation complete: ${highRiskIssues.length} high-risk issues`,
      );

      // Save analysis score to database (regardless of validation result)
      if (fullAnalysis) {
        console.log("[PublishFlow] Saving analysis score to database...");
        try {
          const response = await fetch(
            `/api/compliance/documents/${documentId}/analysis-score`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ analysisScore: fullAnalysis }),
            },
          );
          if (response.ok) {
            console.log("[PublishFlow] ✅ Analysis score saved");
          }
        } catch (error) {
          console.error("[PublishFlow] Failed to save analysis score:", error);
          // Continue anyway - this is non-critical
        }
      }

      // Step 3: Conditional state transition
      if (highRiskIssues.length > 0) {
        // Issues found - block publish but keep draft
        return {
          success: false,
          version,
          status: "draft",
          highRiskIssues,
          fullAnalysis,
          message:
            "Document saved. Please check audit issues before publishing.",
        };
      }

      // No issues - finalize publish with updated analysis score and comment
      console.log(
        "[PublishFlow] Step 3: Finalizing publish state with analysis score...",
      );
      const { status, version: publishedVersion } = await finalizePublishState(
        documentId,
        content,
        version,
        fullAnalysis,
        options?.comment,
      );
      console.log(
        `[PublishFlow] ✅ Document published successfully (status: ${status}, version: ${publishedVersion})`,
      );

      return {
        success: true,
        version: publishedVersion,
        status,
        highRiskIssues: [],
        fullAnalysis,
        message: "Document published successfully",
      };
    } else {
      console.log(
        "[PublishFlow] Step 2: Skipping audit validation (user override)",
      );

      // Validation skipped - finalize publish without new analysis but with comment
      console.log("[PublishFlow] Step 3: Finalizing publish state...");
      const { status, version: publishedVersion } = await finalizePublishState(
        documentId,
        content,
        version,
        undefined,
        options?.comment,
      );
      console.log(
        `[PublishFlow] ✅ Document published successfully (status: ${status}, version: ${publishedVersion})`,
      );

      return {
        success: true,
        version: publishedVersion,
        status,
        highRiskIssues: [],
        message: "Document published successfully",
      };
    }
  } catch (error) {
    console.error("[PublishFlow] Error in publish flow:", error);
    throw error;
  }
}
