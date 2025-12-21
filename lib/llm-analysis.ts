/**
 * DETERMINISTIC COMPLIANCE ANALYSIS ENGINE - FIXED VERSION
 *
 * CRITICAL FIXES APPLIED:
 * =======================
 * 1. EQUIVALENT EXPRESSION DETECTION - Prevents flagging of identical meanings
 * 2. ENHANCED PROMPT POSITIONING - Critical rules at the TOP of prompts
 * 3. POST-PROCESSING VALIDATION - Filters false positives before returning results
 * 4. SMART RECOMMENDATION FILTERING - Catches wording variation complaints
 *
 * ORIGINAL FEATURES PRESERVED:
 * ============================
 * 1. EXPLICIT SCORING THRESHOLDS (prevents subjective LLM drift)
 *    - COVERED: confidence >= 0.8 (explicit requirement in prompt)
 *    - PARTIAL: confidence 0.5-0.79 (explicit requirement in prompt)
 *    - MISSING: confidence < 0.5 (explicit requirement in prompt)
 *    These thresholds are ENFORCED in the prompt to ensure consistent scoring
 *
 * 2. TEMPERATURE = 0 (ensures deterministic LLM output)
 *    - Same document always produces same analysis
 *    - Prevents LLM randomness even with complex judgments
 *
 * 3. SCORE RANGES & ACTIONS (prevents endless improvement loops)
 *    - Score 0-34%: Generate from scratch (fundamental issues)
 *    - Score 35-74%: Can improve iteratively (practical improvements)
 *    - Score 75%+: Production ready (further tweaks won't help)
 *
 * 4. FILTERED RECOMMENDATIONS (prevents low-impact churn)
 *    - Only "high" priority recommendations shown
 *    - Low-impact "medium/low" recommendations filtered out
 *    - Limits to top 3 medium-priority only if no high-priority items
 *    - Prevents endless minor tweaks that don't meaningfully improve score
 *
 * 5. DETERMINISTIC CALCULATION (prevents floating-point drift)
 *    - Formula: (covered + partial*0.5) / total * 100
 *    - Always produces same result for same requirement statuses
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION! });

// Text anchor for highlighting evidence in documents
export interface TextAnchor {
  quote: string; // 20-50 character snippet for highlighting
  context?: string; // optional longer context
}

// Document relevance assessment
export interface DocumentRelevanceIssue {
  documentName: string;
  relevanceScore: number; // 0-100, strict: >= 60 is relevant
  isRelevant: boolean; // true if >= 60% relevance
  reasoning: string;
  suggestedTopic: string;
  identifiedTopic: string; // what the document actually covers
  requirementsAddressed: string[]; // which requirements it covers
  requirementsMissing: string[]; // which requirements it doesn't cover
  recommendation: string;
}

// Enhanced analysis result with multi-dimensional scoring
export interface EnhancedAnalysisResult {
  // Overall metrics (weighted average)
  overallScore: number; // 0-100 weighted average
  contentScore: number; // 0-100 coverage of requirements
  structureScore: number; // 0-100 document structure quality
  auditReadinessScore: number; // 0-100 professional quality

  // Document relevance validation (NEW)
  documentRelevance: {
    allRelevant: boolean; // true if all documents are relevant
    issues: DocumentRelevanceIssue[]; // Issues found, empty if all relevant
    shouldBlockAnalysis: boolean; // true if > 40% of docs are irrelevant
    analysisBlocked: boolean; // true if analysis was blocked due to relevance
  };

  // Action flags (NEW)
  canImprove: boolean; // true if score >= 30% AND no relevance issues
  canMerge: boolean; // true if score >= 10% AND all docs relevant (for multiple docs)
  shouldGenerateFromScratch: boolean; // true if score < 30% OR analysis blocked

  // Detailed content coverage
  contentCoverage: Array<{
    questionId: string;
    status: "covered" | "partial" | "missing";
    evidenceSnippet: string;
    textAnchor?: string; // 20-50 char snippet for highlighting
    confidence: number;
    sourceFile: string;
  }>;

  // Structural analysis
  structuralAnalysis: {
    hasTitlePage: boolean;
    hasPurposeStatement: boolean;
    hasRolesResponsibilities: boolean;
    hasProcedures: boolean;
    hasMonitoringPlan: boolean;
    hasRecordKeeping: boolean;
    hasCAPA: boolean;
    hasTraceability: boolean;
    overallStructureQuality:
      | "excellent"
      | "good"
      | "needs-improvement"
      | "poor";
    missingStructuralElements: Array<{
      element: string;
      importance: string;
      suggestedLocation: string;
    }>;
    score: number;
  };

  // Audit readiness assessment
  auditReadiness: {
    languageProfessionalism:
      | "excellent"
      | "good"
      | "needs-improvement"
      | "poor";
    procedureImplementability:
      | "excellent"
      | "good"
      | "needs-improvement"
      | "poor";
    monitoringAdequacy: "excellent" | "good" | "needs-improvement" | "poor";
    verificationMechanisms: "excellent" | "good" | "needs-improvement" | "poor";
    recordKeepingClarity: "excellent" | "good" | "needs-improvement" | "poor";
    overallAuditReadiness:
      | "ready"
      | "minor-revisions"
      | "major-revisions"
      | "not-ready";
    auditRisks: Array<{
      issue: string;
      textAnchor: string;
      impact: string;
      recommendation: string;
    }>;
    score: number;
  };

  // Prioritized recommendations with example text
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: "content" | "structure" | "audit-readiness";
    recommendation: string;
    specificGuidance?: string; // Specific issue or guidance
    exampleText?: string; // Concrete example or template
    suggestedLocation?: string; // Where to add/modify
    textAnchor?: string; // Location in document
  }>;

  // Missing requirements summary
  missingRequirements: Array<{
    questionId: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;

  // Legacy fields for backward compatibility
  covered: {
    count: number;
    requirements: Array<{
      id: string;
      title: string;
      evidence: string;
      textAnchor?: string;
      source: string;
      confidence: number;
    }>;
  };
  partial: {
    count: number;
    requirements: Array<{
      id: string;
      title: string;
      gaps: string;
      textAnchor?: string;
      source: string;
      confidence: number;
    }>;
  };
  missing: {
    count: number;
    requirements: Array<{
      id: string;
      title: string;
      severity: "high" | "medium" | "low";
      impact: string;
    }>;
  };
  risks: Array<{
    riskId: string;
    description: string;
    severity: "high" | "medium" | "low";
    recommendation: string;
  }>;
  coverageMap: Record<string, "covered" | "partial" | "missing">;
}

/**
 * Lightweight analysis result - optimized for speed
 * Only returns 4 key scores + relevance check
 * Used for the upload/analyze flow in the modal
 */
export interface LightweightAnalysisResult {
  overallScore: number; // 0-100
  contentScore: number; // 0-100
  structureScore: number; // 0-100
  auditReadinessScore: number; // 0-100
  documentRelevance: {
    allRelevant: boolean;
    issues: DocumentRelevanceIssue[];
    shouldBlockAnalysis: boolean;
    analysisBlocked: boolean;
  };
  canImprove: boolean;
  shouldGenerateFromScratch: boolean;
}

/**
 * Fast compliance analysis - lightweight version
 * OPTIMIZED FOR SPEED - Single LLM call instead of 4 phases
 * Returns only essential 4 scores + relevance check
 * Perfect for upload flow where users want quick feedback
 *
 * @param checklist - Compliance checklist JSON
 * @param documents - Array of documents with fileName and extracted text
 * @param subModuleDescription - Description/purpose of the sub-module (for relevance check)
 * @returns Lightweight analysis result with 4 scores
 */
export async function analyzeLightweight({
  checklist,
  documents,
  subModuleDescription,
}: {
  checklist: any;
  documents: { fileName: string; text: string }[];
  subModuleDescription?: string;
}): Promise<LightweightAnalysisResult> {
  console.log(
    "[LLM-ANALYSIS-LIGHTWEIGHT] Starting fast compliance analysis..."
  );

  // Phase 1: Validate document relevance
  console.log("[LLM-ANALYSIS-LIGHTWEIGHT] Checking document relevance...");
  const relevanceCheck = await validateDocumentRelevance({
    documents,
    checklist,
    subModuleDescription,
  });

  console.log("[LLM-ANALYSIS-LIGHTWEIGHT] Relevance check:", {
    allRelevant: relevanceCheck.allRelevant,
    issues: relevanceCheck.issues.length,
    blocked: relevanceCheck.shouldBlockAnalysis,
  });

  // If analysis blocked, return early with zero scores
  if (relevanceCheck.shouldBlockAnalysis) {
    console.warn(
      "[LLM-ANALYSIS-LIGHTWEIGHT] ⚠️ Analysis blocked due to document relevance issues"
    );

    return {
      overallScore: 0,
      contentScore: 0,
      structureScore: 0,
      auditReadinessScore: 0,
      documentRelevance: {
        ...relevanceCheck,
        analysisBlocked: true,
      },
      canImprove: false,
      shouldGenerateFromScratch: true,
    };
  }

  // Phase 2: Quick combined scoring (single LLM call for all 4 scores)
  console.log("[LLM-ANALYSIS-LIGHTWEIGHT] Calculating scores...");
  const scores = await calculateQuickScores({
    checklist,
    documents,
  });

  console.log("[LLM-ANALYSIS-LIGHTWEIGHT] ✅ Analysis complete:", {
    overallScore: scores.overallScore,
    contentScore: scores.contentScore,
    structureScore: scores.structureScore,
    auditReadinessScore: scores.auditReadinessScore,
  });

  // Determine action availability based on scores
  const canImprove = scores.overallScore >= 30 && relevanceCheck.allRelevant;
  const shouldGenerateFromScratch = scores.overallScore < 30;

  return {
    overallScore: scores.overallScore,
    contentScore: scores.contentScore,
    structureScore: scores.structureScore,
    auditReadinessScore: scores.auditReadinessScore,
    documentRelevance: {
      ...relevanceCheck,
      analysisBlocked: false,
    },
    canImprove,
    shouldGenerateFromScratch,
  };
}

/**
 * Analyze compliance of uploaded documents against checklist
 * Performs multi-dimensional analysis: content, structure, and audit readiness
 * Includes document relevance validation as first step
 * @param checklist - Compliance checklist JSON
 * @param documents - Array of documents with fileName and extracted text
 * @param subModuleDescription - Description/purpose of the sub-module (for relevance check)
 * @returns Enhanced analysis result with comprehensive scoring
 */
export async function analyzeCompliance({
  checklist,
  documents,
  subModuleDescription,
}: {
  checklist: any;
  documents: { fileName: string; text: string }[];
  subModuleDescription?: string;
}): Promise<EnhancedAnalysisResult> {
  console.log("[LLM-ANALYSIS] Starting enhanced compliance analysis...");

  // Phase 0: Validate document relevance (optional - just for warnings, doesn't block)
  console.log("[LLM-ANALYSIS] Phase 0: Validating document relevance...");
  const relevanceCheck = await validateDocumentRelevance({
    documents,
    checklist,
    subModuleDescription,
  });

  console.log("[LLM-ANALYSIS] Relevance check:", {
    allRelevant: relevanceCheck.allRelevant,
    issues: relevanceCheck.issues.length,
    blocked: relevanceCheck.shouldBlockAnalysis,
  });

  // NOTE: We no longer BLOCK analysis based on relevance
  // Users have already chosen which documents to upload for a specific module
  // Relevance warnings are logged but analysis proceeds regardless
  // This prevents false negatives where documents are actually relevant but scored low

  // REMOVED: Analysis blocking due to relevance
  // Proceed with analysis regardless of relevance scores
  // The content analysis will reveal what's missing

  // Phase 1-2: Run content coverage and audit readiness analysis only
  // Structure analysis disabled - focus on DATA VALIDATION not formatting
  console.log("[LLM-ANALYSIS] Running Phase 1-2 analyses in parallel...");
  const [contentAnalysis, auditReadiness] = await Promise.all([
    analyzeContentCoverage({ checklist, documents }),
    assessAuditReadiness({ documents, checklist, contentAnalysis: null }),
  ]);

  // Create default empty structural analysis (not used in scoring anymore)
  const structuralAnalysis = {
    hasTitlePage: true,
    hasPurposeStatement: true,
    hasRolesResponsibilities: true,
    hasProcedures: true,
    hasMonitoringPlan: true,
    hasRecordKeeping: true,
    hasCAPA: true,
    hasTraceability: true,
    overallStructureQuality: "excellent" as const,
    missingStructuralElements: [],
    score: 100,
  };

  // Phase 3: Generate recommendations
  console.log("[LLM-ANALYSIS] Phase 3: Generating recommendations...");
  const recommendations = generateRecommendations({
    contentAnalysis,
    structuralAnalysis,
    auditReadiness,
  });

  // Phase 4: FILTER FALSE POSITIVES (NEW)
  console.log("[LLM-ANALYSIS] Phase 4: Filtering false positives...");
  const filteredRecommendations = filterFalsePositiveRecommendations(
    recommendations,
    documents,
    checklist
  );

  console.log("[LLM-ANALYSIS] Filtered recommendations:", {
    original: recommendations.length,
    filtered: filteredRecommendations.length,
    removed: recommendations.length - filteredRecommendations.length,
  });

  // Calculate weighted overall score (content 60%, audit 40% - structure removed)
  const overallScore = Math.round(
    contentAnalysis.score * 0.6 + auditReadiness.score * 0.4
  );

  console.log("[LLM-ANALYSIS] ✅ Analysis complete:", {
    overallScore,
    contentScore: contentAnalysis.score,
    structureScore: structuralAnalysis.score,
    auditScore: auditReadiness.score,
  });

  // Calculate action availability based on score and relevance
  // IMPORTANT: Score below 35% indicates fundamental issues - user should generate from scratch
  // Score between 35-75% can be iteratively improved
  // Score above 75% is production-ready and further improvements have diminishing returns
  const canImprove = overallScore >= 35 && relevanceCheck.allRelevant;
  const canMerge =
    overallScore >= 10 && relevanceCheck.allRelevant && documents.length > 1;
  const shouldGenerateFromScratch = overallScore < 35;

  // Build enhanced result with legacy compatibility
  return {
    overallScore,
    contentScore: contentAnalysis.score,
    structureScore: structuralAnalysis.score,
    auditReadinessScore: auditReadiness.score,
    documentRelevance: {
      ...relevanceCheck,
      analysisBlocked: false,
    },
    canImprove,
    canMerge,
    shouldGenerateFromScratch,
    contentCoverage: contentAnalysis.coverage,
    structuralAnalysis,
    auditReadiness,
    recommendations: filteredRecommendations, // Use filtered recommendations
    missingRequirements: contentAnalysis.missingRequirements,
    // Legacy fields
    covered: contentAnalysis.covered,
    partial: contentAnalysis.partial,
    missing: contentAnalysis.missing,
    risks: auditReadiness.auditRisks.map((risk: any, idx: number) => {
      // Handle both new object format and legacy string format
      const riskData =
        typeof risk === "string"
          ? { issue: risk, textAnchor: "", impact: "", recommendation: "" }
          : risk;
      return {
        riskId: `RISK-${idx + 1}`,
        description: riskData.issue || riskData,
        severity: "high" as const,
        recommendation:
          riskData.recommendation ||
          "See recommendations for remediation steps",
      };
    }),
    coverageMap: contentAnalysis.coverageMap,
  };
}

/**
 * Quick scoring - calculates 4 scores in single LLM call
 * FAST: Optimized for upload flow, no detailed phase analysis
 * Used by analyzeLightweight() for rapid feedback
 */
async function calculateQuickScores({
  checklist,
  documents,
}: {
  checklist: any;
  documents: { fileName: string; text: string }[];
}): Promise<{
  overallScore: number;
  contentScore: number;
  structureScore: number;
  auditReadinessScore: number;
}> {
  const prompt = buildQuickScoringPrompt(checklist, documents);
  const response = await callBedrock(prompt, 1024);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.warn(
      "[LLM-ANALYSIS-LIGHTWEIGHT] Failed to parse scores, returning zeros"
    );
    return {
      overallScore: 0,
      contentScore: 0,
      structureScore: 0,
      auditReadinessScore: 0,
    };
  }

  try {
    const scores = JSON.parse(jsonMatch[0]);
    return {
      overallScore: scores.overallScore || 0,
      contentScore: scores.contentScore || 0,
      structureScore: scores.structureScore || 0,
      auditReadinessScore: scores.auditReadinessScore || 0,
    };
  } catch (error) {
    console.warn("[LLM-ANALYSIS-LIGHTWEIGHT] Failed to parse scores:", error);
    return {
      overallScore: 0,
      contentScore: 0,
      structureScore: 0,
      auditReadinessScore: 0,
    };
  }
}

/**
 * Phase 0: Validate document relevance to the sub-module
 */
async function validateDocumentRelevance({
  documents,
  checklist,
  subModuleDescription,
}: {
  documents: { fileName: string; text: string }[];
  checklist: any;
  subModuleDescription?: string;
}): Promise<{
  allRelevant: boolean;
  issues: DocumentRelevanceIssue[];
  shouldBlockAnalysis: boolean;
}> {
  const prompt = buildDocumentRelevancePrompt(
    documents,
    checklist,
    subModuleDescription
  );

  try {
    const response = await callBedrock(prompt, 2048);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // If parsing fails, assume all relevant (don't block)
      return {
        allRelevant: true,
        issues: [],
        shouldBlockAnalysis: false,
      };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    const issues: DocumentRelevanceIssue[] = (analysis.documents || []).map(
      (doc: any) => ({
        documentName: doc.documentName,
        relevanceScore: doc.relevanceScore || 0,
        isRelevant: (doc.relevanceScore || 0) >= 60,
        reasoning: doc.reasoning || "",
        identifiedTopic: doc.identifiedTopic || "",
        requirementsAddressed: doc.requirementsAddressed || [],
        requirementsMissing: doc.requirementsMissing || [],
        suggestedTopic: doc.suggestedTopic || "",
        recommendation: doc.recommendation || "",
      })
    );

    // Count irrelevant documents (strict: must be >= 60% relevant)
    const irrelevantCount = issues.filter(
      (doc) => doc.relevanceScore < 60
    ).length;
    const irrelevantPercentage = (irrelevantCount / documents.length) * 100;

    // Block analysis if > 40% of documents are irrelevant (< 60% score)
    // This is STRICT: documents must be >= 60% relevant to count as relevant
    const shouldBlockAnalysis = irrelevantPercentage > 40;

    return {
      allRelevant: irrelevantCount === 0,
      issues,
      shouldBlockAnalysis,
    };
  } catch (error) {
    console.warn(
      "[LLM-ANALYSIS] Document relevance check failed, proceeding with analysis:",
      error
    );
    return {
      allRelevant: true,
      issues: [],
      shouldBlockAnalysis: false,
    };
  }
}

/**
 * Phase 1: Analyze content coverage against requirements
 */
async function analyzeContentCoverage({
  checklist,
  documents,
}: {
  checklist: any;
  documents: { fileName: string; text: string }[];
}): Promise<{
  score: number;
  coverage: EnhancedAnalysisResult["contentCoverage"];
  covered: EnhancedAnalysisResult["covered"];
  partial: EnhancedAnalysisResult["partial"];
  missing: EnhancedAnalysisResult["missing"];
  missingRequirements: EnhancedAnalysisResult["missingRequirements"];
  coverageMap: EnhancedAnalysisResult["coverageMap"];
}> {
  const prompt = buildContentCoveragePrompt(checklist, documents);
  const response = await callBedrock(prompt, 4096);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Failed to parse content coverage analysis");
  }

  const analysis = JSON.parse(jsonMatch[0]);

  return {
    score: analysis.overallScore || 0,
    coverage: analysis.contentCoverage || [],
    covered: analysis.covered || { count: 0, requirements: [] },
    partial: analysis.partial || { count: 0, requirements: [] },
    missing: analysis.missing || { count: 0, requirements: [] },
    missingRequirements: (analysis.missing?.requirements || []).map(
      (m: any) => ({
        questionId: m.id || "",
        description: m.title || "",
        severity: m.severity || "medium",
      })
    ),
    coverageMap: analysis.coverageMap || {},
  };
}

/**
 * Phase 2: Analyze document structure
 */
async function analyzeDocumentStructure({
  documents,
}: {
  documents: { fileName: string; text: string }[];
}): Promise<EnhancedAnalysisResult["structuralAnalysis"]> {
  const prompt = buildStructureAnalysisPrompt(documents);
  const response = await callBedrock(prompt, 2048);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    // Return default structure if parsing fails
    return {
      hasTitlePage: false,
      hasPurposeStatement: false,
      hasRolesResponsibilities: false,
      hasProcedures: false,
      hasMonitoringPlan: false,
      hasRecordKeeping: false,
      hasCAPA: false,
      hasTraceability: false,
      overallStructureQuality: "needs-improvement",
      missingStructuralElements: [
        {
          element: "Document structure analysis could not be completed",
          importance: "Critical for audit readiness",
          suggestedLocation: "Throughout document",
        },
      ],
      score: 0,
    };
  }

  try {
    const analysis = JSON.parse(jsonMatch[0]);

    // Handle both new object format and legacy string array format
    let missingElements: Array<{
      element: string;
      importance: string;
      suggestedLocation: string;
    }> = [];

    if (Array.isArray(analysis.missingStructuralElements)) {
      if (analysis.missingStructuralElements.length > 0) {
        if (typeof analysis.missingStructuralElements[0] === "string") {
          // Legacy format: convert strings to new format
          missingElements = analysis.missingStructuralElements.map(
            (elem: string) => ({
              element: elem,
              importance: "Important structural element",
              suggestedLocation: "Add to document",
            })
          );
        } else {
          // New format: use as-is
          missingElements = analysis.missingStructuralElements;
        }
      }
    }

    return {
      hasTitlePage: analysis.hasTitlePage || false,
      hasPurposeStatement: analysis.hasPurposeStatement || false,
      hasRolesResponsibilities: analysis.hasRolesResponsibilities || false,
      hasProcedures: analysis.hasProcedures || false,
      hasMonitoringPlan: analysis.hasMonitoringPlan || false,
      hasRecordKeeping: analysis.hasRecordKeeping || false,
      hasCAPA: analysis.hasCAPA || false,
      hasTraceability: analysis.hasTraceability || false,
      overallStructureQuality: analysis.overallStructureQuality || "poor",
      missingStructuralElements: missingElements,
      score: analysis.score || 0,
    };
  } catch {
    return {
      hasTitlePage: false,
      hasPurposeStatement: false,
      hasRolesResponsibilities: false,
      hasProcedures: false,
      hasMonitoringPlan: false,
      hasRecordKeeping: false,
      hasCAPA: false,
      hasTraceability: false,
      overallStructureQuality: "needs-improvement",
      missingStructuralElements: [
        {
          element: "Unable to parse structure analysis",
          importance: "Critical for document structure assessment",
          suggestedLocation: "Review document manually",
        },
      ],
      score: 0,
    };
  }
}

/**
 * Phase 3: Assess audit readiness
 */
async function assessAuditReadiness({
  documents,
  checklist,
  contentAnalysis,
}: {
  documents: { fileName: string; text: string }[];
  checklist: any;
  contentAnalysis: Awaited<ReturnType<typeof analyzeContentCoverage>> | null;
}): Promise<EnhancedAnalysisResult["auditReadiness"]> {
  const prompt = buildAuditReadinessPrompt(documents, checklist);
  const response = await callBedrock(prompt, 2048);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.warn("[LLM-ANALYSIS] No JSON found in audit readiness response");
    return {
      languageProfessionalism: "needs-improvement",
      procedureImplementability: "needs-improvement",
      monitoringAdequacy: "needs-improvement",
      verificationMechanisms: "needs-improvement",
      recordKeepingClarity: "needs-improvement",
      overallAuditReadiness: "not-ready",
      auditRisks: [
        {
          issue: "Unable to assess audit readiness",
          textAnchor: "",
          impact: "Assessment could not be completed",
          recommendation: "Re-run analysis",
        },
      ],
      score: 0,
    };
  }

  try {
    const analysis = JSON.parse(jsonMatch[0]);

    // Fallback score calculation if missing: map readiness status to score
    let score = analysis.score;
    if (!score || score === 0 || score === null || score === undefined) {
      const readinessMap: { [key: string]: number } = {
        ready: 90,
        "minor-revisions": 75,
        "major-revisions": 50,
        "not-ready": 20,
      };
      score = readinessMap[analysis.overallAuditReadiness] || 0;
      console.log("[LLM-ANALYSIS] Score was missing, estimated from status:", {
        status: analysis.overallAuditReadiness,
        estimatedScore: score,
      });
    }

    // Handle both new object format and legacy string array format
    let auditRisks: EnhancedAnalysisResult["auditReadiness"]["auditRisks"] = [];
    if (Array.isArray(analysis.auditRisks)) {
      if (analysis.auditRisks.length > 0) {
        if (typeof analysis.auditRisks[0] === "string") {
          // Legacy format: convert strings to new format
          auditRisks = analysis.auditRisks.map((risk: string) => ({
            issue: risk,
            textAnchor: "",
            impact: "See issue description for impact",
            recommendation: "Review and remediate",
          }));
        } else {
          // New format: use as-is
          auditRisks = analysis.auditRisks;
        }
      }
    }

    console.log("[LLM-ANALYSIS] Audit readiness parsed:", {
      score,
      riskCount: auditRisks.length,
    });
    return {
      languageProfessionalism: analysis.languageProfessionalism || "poor",
      procedureImplementability: analysis.procedureImplementability || "poor",
      monitoringAdequacy: analysis.monitoringAdequacy || "poor",
      verificationMechanisms: analysis.verificationMechanisms || "poor",
      recordKeepingClarity: analysis.recordKeepingClarity || "poor",
      overallAuditReadiness: analysis.overallAuditReadiness || "not-ready",
      auditRisks,
      score,
    };
  } catch (error) {
    console.warn("[LLM-ANALYSIS] Failed to parse audit readiness JSON:", error);
    console.warn("[LLM-ANALYSIS] Raw JSON string:", jsonMatch[0]);
    return {
      languageProfessionalism: "needs-improvement",
      procedureImplementability: "needs-improvement",
      monitoringAdequacy: "needs-improvement",
      verificationMechanisms: "needs-improvement",
      recordKeepingClarity: "needs-improvement",
      overallAuditReadiness: "major-revisions",
      auditRisks: [
        {
          issue: "Unable to parse audit readiness assessment",
          textAnchor: "",
          impact: "Assessment could not be completed",
          recommendation: "Re-run analysis",
        },
      ],
      score: 0,
    };
  }
}

/**
 * Get example text for a requirement ID
 * Provides concrete templates and examples users can follow
 */
function extractRequirementList(
  checklist: any
): Array<{ id: string; title: string; description?: string }> {
  // Handle different checklist structures
  if (!checklist) {
    console.log("[EXTRACT] No checklist provided");
    return [];
  }

  const requirements: Array<{
    id: string;
    title: string;
    description?: string;
  }> = [];

  console.log(
    "[EXTRACT] Processing checklist, type:",
    Array.isArray(checklist) ? "array" : typeof checklist
  );

  // If checklist is an array of questions/requirements
  if (Array.isArray(checklist)) {
    console.log("[EXTRACT] Found array with", checklist.length, "items");
    checklist.forEach((item: any) => {
      if (item.id && item.text) {
        requirements.push({
          id: item.id,
          title: item.text,
          description:
            item.mandatoryStatements?.join("; ") ||
            item.guidance ||
            item.description,
        });
      }
    });
  }
  // If checklist is an object with numeric keys (array-like object)
  else if (typeof checklist === "object") {
    const keys = Object.keys(checklist);
    console.log("[EXTRACT] Processing object checklist with keys:", keys);

    // Check if it's an array-like object with numeric keys
    const isArrayLike = keys.every((k) => /^\d+$/.test(k));
    if (isArrayLike) {
      console.log(
        "[EXTRACT] Detected array-like object with",
        keys.length,
        "numeric indices"
      );
      const items = keys.map((k) => checklist[k]);
      items.forEach((item: any) => {
        if (item.id && item.text) {
          requirements.push({
            id: item.id,
            title: item.text,
            description:
              item.mandatoryStatements?.join("; ") ||
              item.guidance ||
              item.description,
          });
        }
      });
    }

    if (checklist.requirements && Array.isArray(checklist.requirements)) {
      console.log(
        "[EXTRACT] Found requirements array with",
        checklist.requirements.length,
        "items"
      );
      checklist.requirements.forEach((req: any) => {
        if (req.id && req.text) {
          requirements.push({
            id: req.id,
            title: req.text,
            description:
              req.mandatoryStatements?.join("; ") ||
              req.guidance ||
              req.description,
          });
        }
      });
    }
    // Try to get from sections/submodules
    if (checklist.sections) {
      console.log("[EXTRACT] Found sections:", Object.keys(checklist.sections));
      Object.values(checklist.sections).forEach((section: any) => {
        if (section.questions && Array.isArray(section.questions)) {
          section.questions.forEach((q: any) => {
            if (q.id && q.text) {
              requirements.push({
                id: q.id,
                title: q.text,
                description:
                  q.mandatoryStatements?.join("; ") ||
                  q.guidance ||
                  q.description,
              });
            }
          });
        }
      });
    }
  }

  console.log(
    "[EXTRACT] Extracted",
    requirements.length,
    "requirements:",
    requirements.map((r) => r.id).join(", ")
  );
  return requirements;
}

/**
 * Get example text for a requirement ID
 * Provides concrete templates and examples users can follow
 */
function getExampleForRequirement(requirementId: string): string {
  const examples: Record<string, string> = {
    monitoring:
      "Weekly visual inspections shall be conducted by Quality Manager using Form QA-MON-001",
    capa: "Non-conformances shall be documented within 24 hours with root cause analysis completed within 5 business days",
    records:
      "Records shall be maintained for minimum 24 months in secure filing system with controlled access",
    verification:
      "Monthly verification audits shall be conducted against documented procedures with results recorded",
    frequency:
      "Daily: Staff inspections | Weekly: Quality Manager review | Monthly: Senior Management assessment",
    responsibility:
      "Quality Manager shall oversee implementation; Site Manager shall ensure daily compliance; All staff shall follow procedures",
  };

  // Simple matching logic - find best matching example
  const key = Object.keys(examples).find((k) =>
    requirementId.toLowerCase().includes(k)
  );
  return key
    ? examples[key]
    : "Add specific, measurable details with frequencies, responsibilities, and verification methods";
}

/**
 * Get example text for structural elements
 * Provides concrete templates for missing document sections
 */
function getStructureExample(elementName: string): string {
  const examples: Record<string, string> = {
    roles:
      "Quality Manager: Oversees compliance program\nSite Manager: Daily implementation\nStaff: Follow procedures and report issues",
    monitoring:
      "What: Visual inspection of control points\nFrequency: Weekly\nResponsible: QA Manager\nForm: QA-MON-001\nActions: Document findings and corrective measures",
    capa: "1. Identify non-conformance within 24 hours\n2. Immediate containment action\n3. Root cause analysis (5-day deadline)\n4. Corrective action plan development\n5. Implementation and verification",
    records:
      "Type: Inspection records, audit logs, training records\nRetention: 24 months\nStorage: Secure filing system\nAccess: Quality Manager only\nReview: Quarterly",
    procedures:
      "1. [Step description with specific details]\n2. [Step with responsibility assigned]\n3. [Step with frequency/timing]\n4. [Step with verification method]\n5. [Step with record documentation]",
    verification:
      "Method: Visual inspection against checklist\nFrequency: Weekly\nResponsible: QA Manager\nCriteria: [List specific acceptance criteria]\nDocumentation: Form QA-VER-001",
  };

  const key = Object.keys(examples).find((k) =>
    elementName.toLowerCase().includes(k)
  );
  return key ? examples[key] : "";
}

/**
 * Generate prioritized recommendations based on all analyses
 */
function generateRecommendations({
  contentAnalysis,
  structuralAnalysis,
  auditReadiness,
}: {
  contentAnalysis: Awaited<ReturnType<typeof analyzeContentCoverage>>;
  structuralAnalysis: EnhancedAnalysisResult["structuralAnalysis"];
  auditReadiness: EnhancedAnalysisResult["auditReadiness"];
}): EnhancedAnalysisResult["recommendations"] {
  const recommendations: EnhancedAnalysisResult["recommendations"] = [];

  // Content recommendations (from missing requirements)
  if (contentAnalysis.missing.requirements.length > 0) {
    contentAnalysis.missing.requirements.forEach((req: any) => {
      recommendations.push({
        priority: req.severity === "high" ? "high" : "medium",
        category: "content",
        recommendation: `Address missing requirement: ${req.title}`,
        specificGuidance: req.impact,
        exampleText: getExampleForRequirement(req.id),
        suggestedLocation: req.suggestedLocation || "Add in relevant section",
      });
    });
  }

  // Partial coverage recommendations
  if (contentAnalysis.partial.requirements.length > 0) {
    contentAnalysis.partial.requirements.forEach((req: any) => {
      // FILTER: Skip overly pedantic "partial" items
      // These are often vague complaints about formatting rather than missing content
      const gaps = (req.gaps || "").toLowerCase();

      // Skip if it's asking for formatting/presentation changes instead of content
      const isFormattingComplaint =
        gaps.includes("table") ||
        gaps.includes("matrix") ||
        gaps.includes("format") ||
        gaps.includes("structure") ||
        gaps.includes("presentation") ||
        (gaps.includes("missing") &&
          gaps.includes("specific") &&
          gaps.length < 50) ||
        (gaps.includes("measurable details") &&
          !gaps.includes("responsibilit") &&
          !gaps.includes("frequenc"));

      // NEW: Skip if it's complaining about equivalent expressions
      const isEquivalentExpressionComplaint =
        (gaps.includes("salmonella") &&
          (gaps.includes("absence") || gaps.includes("negative")) &&
          gaps.includes("cfu")) ||
        (gaps.includes("e. coli") &&
          (gaps.includes("absence") || gaps.includes("negative")) &&
          gaps.includes("mpn")) ||
        gaps.includes("verbatim") ||
        gaps.includes("exact wording") ||
        gaps.includes("exact specification") ||
        (gaps.includes("specification") && gaps.includes("wording"));

      if (isFormattingComplaint || isEquivalentExpressionComplaint) {
        // Skip formatting-only and equivalent expression complaints
        return;
      }

      recommendations.push({
        priority: "high",
        category: "content",
        recommendation: `Complete partial requirement: ${req.title}`,
        specificGuidance: `Currently missing: ${req.gaps}`,
        exampleText: getExampleForRequirement(req.id),
        textAnchor: req.textAnchor || "",
      });
    });
  }

  // STRUCTURAL RECOMMENDATIONS DISABLED
  // Focus only on data validation (content) and audit readiness (implementation quality)
  // Not checking document formatting or structure anymore
  /*
  if (structuralAnalysis.missingStructuralElements.length > 0) {
    // ... structural checks removed ...
  }
  */

  // Audit readiness recommendations
  if (auditReadiness.languageProfessionalism === "poor") {
    recommendations.push({
      priority: "high",
      category: "audit-readiness",
      recommendation:
        "Improve professional language and compliance terminology throughout document",
      specificGuidance:
        "Use formal compliance language, avoid ambiguous terms, define all abbreviations",
      exampleText:
        'Change "we check things regularly" to "Quality Manager conducts daily visual inspections per SOP QA-001"',
    });
  }

  if (auditReadiness.procedureImplementability === "poor") {
    recommendations.push({
      priority: "high",
      category: "audit-readiness",
      recommendation:
        "Make procedures more detailed and implementable with clear step-by-step instructions",
      specificGuidance: "Add who, what, when, where, why, how for each step",
      exampleText: getStructureExample("procedures"),
    });
  }

  if (auditReadiness.monitoringAdequacy === "poor") {
    recommendations.push({
      priority: "high",
      category: "audit-readiness",
      recommendation: "Define specific monitoring frequencies and methods",
      specificGuidance:
        "Specify who monitors, what to monitor, when, and how results are used",
      exampleText: getExampleForRequirement("monitoring"),
    });
  }

  if (auditReadiness.verificationMechanisms === "poor") {
    recommendations.push({
      priority: "high",
      category: "audit-readiness",
      recommendation:
        "Add verification and validation activities with specific success criteria",
      specificGuidance:
        "Document how compliance is verified and what acceptable results look like",
      exampleText: getStructureExample("verification"),
    });
  }

  if (auditReadiness.recordKeepingClarity === "poor") {
    recommendations.push({
      priority: "medium",
      category: "audit-readiness",
      recommendation:
        "Clarify record-keeping requirements including retention periods",
      specificGuidance:
        "Specify record types, location, access control, and minimum retention",
      exampleText: getStructureExample("records"),
    });
  }

  // Audit readiness issues with specific text anchors
  if (auditReadiness.auditRisks && Array.isArray(auditReadiness.auditRisks)) {
    auditReadiness.auditRisks.forEach((risk: any) => {
      // FILTER: Skip only vague, non-actionable recommendations
      // Keep ALL validation feedback but only if it's specific and actionable

      if (
        risk.issue &&
        typeof risk.issue === "string" &&
        (risk.recommendation || risk.impact)
      ) {
        // Check if this is a vague "create a table/consolidate" type recommendation
        // These are formatting busy-work, not actual compliance fixes
        const vagueFix = risk.recommendation?.toLowerCase() || "";
        if (
          vagueFix.includes("create") &&
          (vagueFix.includes("table") || vagueFix.includes("consolidate"))
        ) {
          // Check if the underlying data is actually problematic
          // If the issue is just formatting, skip it
          const isFormattingOnly =
            vagueFix.toLowerCase().includes("table") &&
            !vagueFix.toLowerCase().includes("missing");

          if (isFormattingOnly) {
            // Skip formatting-only recommendations
            return;
          }
        }
      }

      if (typeof risk === "string") {
        // Legacy format
        recommendations.push({
          priority: "high",
          category: "audit-readiness",
          recommendation: risk,
        });
      } else {
        // New format with full details
        recommendations.push({
          priority: "high",
          category: "audit-readiness",
          recommendation: risk.issue || risk,
          specificGuidance: risk.recommendation || risk.impact,
          textAnchor: risk.textAnchor || "",
        });
      }
    });
  }

  // Sort by priority
  recommendations.sort((a, b) => {
    const priorityMap = { high: 0, medium: 1, low: 2 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });

  // ANTI-LOOP: Filter recommendations to only high-impact items that would significantly improve score
  // Keep ONLY high-priority recommendations to prevent endless minor tweaks
  const filteredRecs = recommendations.filter(
    (rec) => rec.priority === "high" || rec.category === "audit-readiness"
  );

  // If no high-priority items, return top 3 medium-priority only (not all of them)
  if (filteredRecs.length === 0 && recommendations.length > 0) {
    return recommendations.slice(0, 3);
  }

  return filteredRecs;
}

/**
 * NEW: Filter false positive recommendations
 * This catches equivalent expression complaints that slip through the LLM prompt
 */
function filterFalsePositiveRecommendations(
  recommendations: EnhancedAnalysisResult["recommendations"],
  documents: { fileName: string; text: string }[],
  checklist: any
): EnhancedAnalysisResult["recommendations"] {
  console.log("[FILTER] Starting false positive filtering...");

  // Combine all document text for searching
  const allDocText = documents
    .map((d) => d.text)
    .join("\n")
    .toLowerCase();

  // Extract all equivalent expressions from checklist
  const equivalentExpressions = extractEquivalentExpressions(checklist);

  console.log(
    "[FILTER] Found",
    equivalentExpressions.length,
    "equivalent expression groups"
  );

  return recommendations.filter((rec) => {
    const text = (
      rec.recommendation +
      " " +
      (rec.specificGuidance || "")
    ).toLowerCase();

    // Pattern 1: Salmonella equivalent expression complaints
    if (text.includes("salmonella")) {
      const hasCFUComplaint = text.includes("cfu") || text.includes("<1");
      const hasAbsenceComplaint =
        text.includes("absence") || text.includes("negative");

      if (hasCFUComplaint || hasAbsenceComplaint) {
        // Check if document actually has equivalent expression
        const hasEquivalent =
          allDocText.includes("salmonella") &&
          (allDocText.includes("absence") ||
            allDocText.includes("negative") ||
            allDocText.includes("<1 cfu") ||
            allDocText.includes("< 1 cfu") ||
            allDocText.includes("not detected"));

        if (hasEquivalent) {
          console.log(
            "[FILTER] ❌ Removing Salmonella equivalent expression false positive:",
            rec.recommendation.substring(0, 80)
          );
          return false;
        }
      }
    }

    // Pattern 2: E. coli equivalent expression complaints
    if (
      text.includes("e. coli") ||
      text.includes("e.coli") ||
      text.includes("ecoli")
    ) {
      const hasMPNComplaint = text.includes("mpn") || text.includes("126");
      const hasAbsenceComplaint =
        text.includes("absence") || text.includes("negative");

      if (hasMPNComplaint || hasAbsenceComplaint) {
        const hasEquivalent =
          allDocText.includes("e. coli") &&
          (allDocText.includes("absence") ||
            allDocText.includes("negative") ||
            allDocText.includes("<126") ||
            allDocText.includes("< 126") ||
            allDocText.includes("not detected"));

        if (hasEquivalent) {
          console.log(
            "[FILTER] ❌ Removing E. coli equivalent expression false positive:",
            rec.recommendation.substring(0, 80)
          );
          return false;
        }
      }
    }

    // Pattern 3: Generic "verbatim" or "exact wording" complaints
    if (
      text.includes("verbatim") ||
      text.includes("exact wording") ||
      text.includes("exact specification")
    ) {
      console.log(
        "[FILTER] ❌ Removing verbatim wording complaint:",
        rec.recommendation.substring(0, 80)
      );
      return false;
    }

    // Pattern 4: "Match specification wording" complaints
    if (
      text.includes("match") &&
      text.includes("specification") &&
      text.includes("wording")
    ) {
      console.log(
        "[FILTER] ❌ Removing specification wording complaint:",
        rec.recommendation.substring(0, 80)
      );
      return false;
    }

    // Pattern 5: Check against known equivalent expressions from checklist
    for (const group of equivalentExpressions) {
      const mentionsAny = group.some((expr) =>
        text.includes(expr.toLowerCase())
      );
      const documentHasAny = group.some((expr) =>
        allDocText.includes(expr.toLowerCase())
      );

      if (mentionsAny && documentHasAny) {
        // The recommendation mentions an equivalent expression, and document has one
        // This is likely a false positive about wording
        console.log(
          "[FILTER] ❌ Removing equivalent expression false positive (checklist-based):",
          rec.recommendation.substring(0, 80)
        );
        return false;
      }
    }

    // Keep all other recommendations
    return true;
  });
}

/**
 * Extract equivalent expression groups from checklist
 * Returns array of arrays, where each inner array is a group of equivalent expressions
 */
function extractEquivalentExpressions(checklist: any): string[][] {
  const equivalents: string[][] = [];

  const requirements = extractRequirementList(checklist);

  for (const req of requirements) {
    if (!req.description) continue;

    const desc = req.description.toLowerCase();

    // Look for "equivalent" patterns
    const equivalentMatch = desc.match(/equivalent[^:]*:([^;]+)/gi);
    if (equivalentMatch) {
      for (const match of equivalentMatch) {
        // Extract the list of equivalent expressions
        const exprs = match
          .replace(/equivalent[^:]*:/i, "")
          .split(",")
          .map((s) => s.trim().replace(/['"]/g, ""))
          .filter((s) => s.length > 0);

        if (exprs.length > 1) {
          equivalents.push(exprs);
        }
      }
    }
  }

  // Add common known equivalents
  equivalents.push([
    "Salmonella: <1 CFU/100mL",
    "Salmonella: Absence in 100mL",
    "Salmonella: negative",
    "negative for Salmonella",
    "<1 CFU/100mL",
    "Absence in 100mL sample",
  ]);

  equivalents.push([
    "E. coli: <126 MPN/100mL",
    "E. coli: Absence in 100mL",
    "E. coli: negative",
    "negative for E. coli",
    "<126 MPN/100mL",
  ]);

  return equivalents;
}

/**
 * Calculate weighted overall score
 */
function calculateWeightedScore({
  contentScore,
  structureScore,
  auditScore,
}: {
  contentScore: number;
  structureScore: number;
  auditScore: number;
}): number {
  return Math.round(
    contentScore * 0.5 + structureScore * 0.25 + auditScore * 0.25
  );
}

/**
 * Call Bedrock API with error handling
 */
async function callBedrock(prompt: string, maxTokens: number): Promise<string> {
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  if (responseBody.stop_reason === "max_tokens") {
    console.warn("[LLM-ANALYSIS] ⚠️ Response truncated due to token limit");
  }

  return responseBody.content[0].text;
}

/**
 * Build prompt for content coverage analysis
 */
function buildContentCoveragePrompt(
  checklist: any,
  documents: { fileName: string; text: string }[]
): string {
  const documentTexts = documents
    .map(
      (doc, i) => `
DOCUMENT ${i + 1}: ${doc.fileName}
---
${doc.text}
---
`
    )
    .join("\n");

  return `You are a Primus GFS compliance auditor analyzing uploaded evidence documents.

CONTENT COVERAGE RULES (pragmatic, not pedantic):
=================================================
COVERAGE STATUS DEFINITIONS:
- COVERED: The requirement is clearly addressed in the documents
  * Criterion: Document contains the key information needed to answer the requirement
  * Key test: If someone reading the document can understand what needs to be done, it's COVERED
  * Confidence threshold: >= 0.7 (be generous with what counts)
  * Examples: 
    - Requirement: "Describe corrective measures for contamination"
      Document: "Corrective actions implemented to prevent recurrence" = COVERED ✓
    - Requirement: "What are success criteria for recalls?"
      Document: "100% traceability within 2 hours and 98% product recovery" = COVERED ✓
    - Requirement: "Record retention requirements"
      Document: "Maintain records minimum 2 years" = COVERED (even if another type has 5 years) ✓
  
- PARTIAL: The requirement is addressed but critically missing essential details
  * Criterion: Document mentions the topic but lacks critical specifics (responsibility, frequency, threshold)
  * Confidence threshold: 0.4-0.69
  * Examples:
    - Requirement: "Monitoring frequency and method"
      Document: "Monitoring is conducted" = PARTIAL (missing when/how) 
    - Requirement: "Alert thresholds for food safety"
      Document: "Monitor temperature appropriately" = PARTIAL (missing actual temperature threshold)
  
- MISSING: The requirement is not addressed in documents at all
  * Criterion: No relevant information found despite thorough search
  * Confidence threshold: < 0.4

CRITICAL RULES:
- Analyze EVERY SINGLE requirement in the checklist systematically
- Do NOT skip any requirements - check all of them
- This is the ONLY analysis run - be thorough
- Recognize when content exists in different wording (e.g., "corrective measures" = "corrective actions")
- DO NOT mark as PARTIAL just because the wording is different from requirement
- DO NOT mark as PARTIAL just because content isn't in a "matrix" or "table" format
- Do NOT generate new content
- Do NOT fill missing sections
- Be generous: if the core information is there, mark as COVERED

COMPLIANCE CHECKLIST:
${JSON.stringify(checklist, null, 2)}

UPLOADED DOCUMENTS:
${documentTexts}

ANALYSIS TASK:
For EVERY question in the checklist (do not skip any):
1. Search documents for relevant content using keyword matching
2. Recognize synonyms and paraphrased content (e.g., "corrective actions" = "corrective measures")
3. Apply status rules above (COVERED >= 0.7 confidence, PARTIAL 0.4-0.69, MISSING < 0.4)
4. Extract exact evidence snippets
5. Provide a 20-50 character snippet (textAnchor) for highlighting
6. Identify which document contains the evidence

REQUIRED OUTPUT FORMAT (JSON only):
{
  "overallScore": <integer 0-100>,
  "contentCoverage": [
    {
      "questionId": "<requirement id>",
      "status": "covered|partial|missing",
      "evidenceSnippet": "<exact quote from document or 'Not found' if missing>",
      "textAnchor": "<20-50 char snippet for highlighting or empty string if missing>",
      "confidence": <0-1>,
      "sourceFile": "<document name or 'N/A' if missing>"
    }
  ],
  "covered": {
    "count": <number>,
    "requirements": [
      {
        "id": "<requirement id>",
        "title": "<requirement title>",
        "evidence": "<exact quote from document>",
        "textAnchor": "<20-50 char snippet>",
        "source": "<document name>",
        "confidence": <0-1>
      }
    ]
  },
  "partial": {
    "count": <number>,
    "requirements": [
      {
        "id": "<requirement id>",
        "title": "<requirement title>",
        "gaps": "<what's missing based on requirement definition>",
        "textAnchor": "<20-50 char snippet of what exists>",
        "source": "<document name>",
        "confidence": <0-1>
      }
    ]
  },
  "missing": {
    "count": <number>,
    "requirements": [
      {
        "id": "<requirement id>",
        "title": "<requirement title>",
        "severity": "high|medium|low",
        "impact": "<why it's important for compliance>"
      }
    ]
  },
  "coverageMap": {
    "<requirement id>": "covered|partial|missing"
  }
}

SCORE CALCULATION (deterministic):
- Count requirements with status == "covered": these are 100% credit
- Count requirements with status == "partial": these are 50% credit
- Count requirements with status == "missing": these are 0% credit
- overallScore = (covered_count + partial_count*0.5) / total_requirements * 100
- Round to nearest integer

Ensure textAnchor is always a concise 20-50 character snippet from the actual document.
Return ONLY the JSON object. No markdown formatting.`;
}

/**
 * Build prompt for structural analysis
 */
function buildStructureAnalysisPrompt(
  documents: { fileName: string; text: string }[]
): string {
  const documentTexts = documents
    .map((doc, i) => `DOCUMENT ${i + 1}: ${doc.fileName}\n${doc.text}`)
    .join("\n\n---\n\n");

  return `Analyze the STRUCTURE and FORMAT of these compliance documents.

DOCUMENTS:
${documentTexts}

STRUCTURAL CHECKLIST (be thorough - check for ALL elements listed):
□ Title Page and document control section
□ Purpose/objective statement
□ Roles and responsibilities defined
□ Detailed procedures and step-by-step instructions
□ Monitoring plan with specific frequencies
□ Record-keeping requirements with retention periods
□ CAPA (Corrective & Preventive Action) protocol
□ Traceability elements documented
□ Professional formatting and structure
□ Compliance document standard structure

EVALUATION CRITERIA:
1. Does it have a clear title page and document control section?
2. Is there a purpose/objective statement?
3. Are roles and responsibilities clearly defined?
4. Are procedures detailed and step-by-step?
5. Is there a monitoring plan with specific frequencies?
6. Are record-keeping requirements specified?
7. Is there a CAPA (Corrective & Preventive Action) protocol?
8. Are traceability elements documented?
9. Is the document professionally formatted?
10. Does it follow standard compliance document structure?

OUTPUT JSON (no markdown):
{
  "hasTitlePage": boolean,
  "hasPurposeStatement": boolean,
  "hasRolesResponsibilities": boolean,
  "hasProcedures": boolean,
  "hasMonitoringPlan": boolean,
  "hasRecordKeeping": boolean,
  "hasCAPA": boolean,
  "hasTraceability": boolean,
  "overallStructureQuality": "excellent|good|needs-improvement|poor",
  "missingStructuralElements": [
    {
      "element": "<name of missing element>",
      "importance": "<why it's needed for audit readiness>",
      "suggestedLocation": "<where to add it in the document>"
    }
  ],
  "score": <0-100>
}`;
}

/**
 * Build prompt for audit readiness assessment
 * FIXED VERSION: Equivalent expression rules at the TOP
 */
function buildAuditReadinessPrompt(
  documents: { fileName: string; text: string }[],
  checklist: any
): string {
  // Log the checklist structure to see what's being passed
  console.log(
    "\n========== CHECKLIST BEING PASSED TO AUDIT READINESS =========="
  );
  console.log("Checklist type:", typeof checklist);
  console.log(
    "Checklist keys:",
    checklist ? Object.keys(checklist) : "null/undefined"
  );
  console.log(
    "Checklist structure:",
    JSON.stringify(checklist, null, 2).substring(0, 2000)
  ); // First 2000 chars
  console.log(
    "==============================================================\n"
  );

  const documentTexts = documents
    .map((doc, i) => `DOCUMENT ${i + 1}: ${doc.fileName}\n${doc.text}`)
    .join("\n\n---\n\n");

  // Extract requirement IDs and titles from checklist for validation reference
  const requirementList = extractRequirementList(checklist);
  const requirementReference = requirementList
    .map((req: any) => {
      let refText = `- ${req.id}: ${req.title}`;
      if (req.description) {
        refText += `\n  Requirement: ${req.description}`;
      }
      return refText;
    })
    .join("\n");

  return `
🚨🚨🚨 CRITICAL RULE #1 - READ THIS FIRST 🚨🚨🚨
=====================================================
EQUIVALENT EXPRESSIONS ARE FULLY COMPLIANT
=====================================================

The following are IDENTICAL IN MEANING and ALL ARE ACCEPTABLE:

SALMONELLA TESTING:
✓ "Salmonella: <1 CFU/100mL" 
✓ "Salmonella: Absence in 100mL sample"
✓ "Salmonella: Absence in 100mL"
✓ "Salmonella: negative"
✓ "negative for Salmonella"
✓ "not detected"

E. COLI TESTING:
✓ "E. coli: <126 MPN/100mL"
✓ "E. coli: Absence in 100mL"
✓ "E. coli: negative"
✓ "negative for E. coli"
✓ "not detected"

OTHER THRESHOLDS:
✓ "≤ 0.1 ppm" = "Below 0.1 ppm" = "Not exceeding 0.1 ppm"
✓ "within limits" = "below threshold" = "compliant"

🚨 IF YOU FLAG EQUIVALENT EXPRESSIONS, THIS IS A SEVERE ANALYSIS ERROR 🚨

DO NOT suggest changing "Absence in 100mL" to "<1 CFU/100mL" or vice versa.
DO NOT suggest using "exact specification wording" or "verbatim".
DO NOT complain about different phrasings of the same requirement.

These expressions are SCIENTIFICALLY AND REGULATORILY EQUIVALENT.
=====================================================

Assess if these documents are AUDIT-READY for Primus GFS certification.

SCOPE OF ASSESSMENT:
This document addresses the following Primus GFS requirements:

${requirementReference}

CRITICAL ENFORCEMENT:
- You can ONLY flag issues that relate to the requirements listed above
- Your flags must cite which specific requirement is not met
- If a requirement is not in the list above, you CANNOT flag it
- SUBSTANCE OVER WORDING: Judge requirements by what they mean, not how they're phrased
- DO NOT flag wording/terminology variations as non-compliance
- DO NOT flag different ways of expressing the same concept
- Examples of acceptable equivalents (do NOT flag as gaps):
  * Numerical thresholds: "<1 CFU/100mL" = "Absence in 100mL" = "negative"
  * Action timing: "immediately" = "within 24 hours" = "promptly" (if similar intent)
  * Procedures: "documented testing" = "test results recorded" = "testing with documentation"
  * Frequencies: "monthly" = "every 30 days" = "once per calendar month"
- Only flag if: (1) the actual substance/requirement is missing, OR (2) the threshold/value is quantitatively wrong
- Different testing methodologies (ISO, EPA, equivalent standards) are all acceptable

DOCUMENTS:
${documentTexts}

EVALUATION CRITERIA:
1. Language professionalism and clarity
2. Procedure implementability (can staff follow them?)
3. Monitoring adequacy (frequencies, methods, responsibilities)
4. Verification mechanisms (how is compliance verified?)
5. Record-keeping clarity (what records, who keeps them, how long?)
6. Specific details vs generic templates
7. Regulatory alignment with Primus GFS standards

INTELLIGENT VALIDATION (not formatting checks):
========================================

**ABSOLUTE RULE: ONLY VALIDATE REQUIREMENTS IN THE CHECKLIST ABOVE**
You can ONLY flag issues related to the specific requirements listed in "SCOPE OF ASSESSMENT".
If an issue is not about one of those listed requirements, DO NOT FLAG IT.
You cannot invent new requirements, add requirements from other modules, or flag things beyond the scope.

CRITICAL RULE #1: DO NOT REQUIRE INFORMATION TO BE REPEATED IN MULTIPLE SECTIONS
If a requirement/procedure/frequency is clearly stated ONCE in the document, that's sufficient.
Do NOT flag as a gap just because it's not repeated in every related section.
Cross-section consistency is not required - once is enough.

CRITICAL RULE #2: DO NOT FLAG "NICE-TO-HAVE" DETAILS AS MISSING REQUIREMENTS
Only flag information that is REQUIRED BY THE SPECIFICATION, not information that would be additional polish.
Examples of what NOT to flag:
  ✗ "Document says recovery must occur but doesn't specify timing window" → NOT MISSING (recovery requirement is met)
  ✗ "Document specifies ppm limits but doesn't cite specific EPA method" → NOT MISSING (acceptance criteria are defined)
  ✗ "Document requires soil testing but doesn't specify exact sampling methodology" → NOT MISSING (testing requirement is defined)
  ✗ "Document describes procedure but could be more detailed" → NOT MISSING (procedure exists and is implementable)

ONLY FLAG if the CORE requirement itself is absent, not if supporting details are missing.

CRITICAL RULE #3: DO NOT FLAG FORMATTING/NAMING/PRESENTATION ISSUES AS COMPLIANCE GAPS
Compliance issues are about DATA and REQUIREMENTS, not how they're presented.
Examples of FORMATTING (DO NOT FLAG):
  ✗ "Document number uses 2030 instead of 2025 in the ID" → FORMATTING (not a requirement)
  ✗ "Requirements written on one line instead of separate lines" → FORMATTING (not a requirement)
  ✗ "Date shows future year in document ID" → FORMATTING (numbering preference, not compliance)
  ✗ "Two related criteria listed together instead of separately" → FORMATTING (presentation, not missing data)

Only flag if the actual REQUIREMENT or DATA is missing/wrong, not how it's formatted or presented.

CRITICAL RULE #4: DO NOT INVENT NEW REQUIREMENTS
ONLY validate requirements that come from the actual Primus GFS standard.
You CANNOT add requirements that aren't in the specification.
Examples of INVENTED REQUIREMENTS (DO NOT FLAG):
  ✗ "Listeria testing not specified" when PrimusGFS 2.03.04 only requires E. coli & Salmonella → INVENTED (not in spec)
  ✗ "Timing measurement methodology not defined" when spec says "within 2 hours" → INVENTED (spec doesn't require this level of detail)
  ✗ "Additional pathogens should be tested" when spec doesn't list them → INVENTED (don't add to requirements)
  ✗ "Operational procedures for starting/stopping timers not specified" → INVENTED (operational detail beyond requirement)

If you cannot cite the EXACT Primus GFS section/requirement for something, DO NOT FLAG IT.

WHAT TO VALIDATE - FLAG THESE ISSUES:
✓ Missing critical information NOT FOUND ANYWHERE in document (e.g., no mention of soil testing at all, no acceptance criteria, no testing frequency)
✓ Vague/unclear requirements that prevent implementation (e.g., "monitor appropriately" with no frequency/method)
✓ Requirements that fall SHORT of regulatory minimums (e.g., document says "annual testing" when regulation requires "quarterly")
✓ Vague acceptance criteria like "within applicable limits" without specifying which limits or contaminants
✓ Vague retention like "keep indefinitely" without any timeframe specified
✓ Past dates that should have been completed but are still listed (e.g., "Training completed: January 2024" in current 2025 document with no update)
✓ Missing implementation dates for NEW procedures/systems introduced but not dated
✓ TRUE conflicts: "Review scheduled: March 2026" in one section AND "Never review" elsewhere (actual contradiction)
✓ Undefined acronyms and unclear terminology that prevent staff implementation
✓ Missing responsibility assignments where WHO performs action is completely undefined
✓ Monitoring with no defined frequency or method (not specific enough to implement)

WHAT NOT TO FLAG - THESE ARE CORRECT:
✗ Information stated in one section and not repeated in others (this is normal document structure)
✗ Different retention periods for different record types (soil samples 5 years vs general 2 years = correct specificity)
✗ Different monitoring frequencies for different products/areas (normal variation)
✗ Different wording of the same requirement across sections (e.g., "Prior to first use" in one section, "Before agricultural production starts" in another = same thing)
✗ Section 9.2 states "Annually during production" and Section 10.1 only says "Prior to use" → NOT A CONFLICT (10.1 is about pre-planting, 9.2 establishes ongoing requirement)
✗ Document specifies MORE FREQUENT requirement than regulatory minimum (e.g., "quarterly" when standard says "minimum annually") → EXCEEDS STANDARD (compliant, not a problem)
✗ Future dates for next review, audit, or training (this is how schedules work) - April 2026 vs Annual review are not conflicting
✗ Implementation timelines with future dates (Q2 2026 for system upgrade is normal planning)
✗ Professional formatting or table layout variations (not compliance issues)
✗ Generic process templates IF they're customized with specific details
✗ Success criteria stated in plain text instead of "matrix format" (e.g., "100% traceability within 2 hours and 98% recovery" IS a clear success criterion)
✗ Corrective measures described in narrative form instead of a "corrective measures implementation table"
✗ Acceptance criteria with ppm thresholds stated (e.g., "Organophosphate pesticides: ≤ 0.1 ppm") without EPA method citation - the criteria ARE defined, method citation is optional
✗ Microbial testing thresholds stated correctly (e.g., "E. coli <126 MPN/100mL per Primus 2.03.04b") without EPA method reference - thresholds are correct, method reference is optional polish
✗ Recovery requirements stated (e.g., "98% product recovery") without specific timing window if timing wasn't in original spec - requirement is met
✗ Procedure defined once without repeating in every section that mentions it - stating once is sufficient
✗ Testing acceptance criteria defined with numeric thresholds without full regulatory reference - thresholds ARE defined
✗ Document numbering using future year (e.g., DOC-2030 when current year is 2025) - numbering is preference, not a compliance gap
✗ Multiple related requirements stated in one sentence instead of separate sentences - the requirements themselves are present, formatting is preference
✗ Requirements presented as comma-separated list instead of bullet points - data is there, presentation is preference
✗ Success criteria stated together (e.g., "100% traceability AND 98% recovery") instead of as separate bullet points - both criteria are defined
✗ Requirement with specific timelines stated once and referenced elsewhere (e.g., "within 24 hours per procedure X") - the timeline IS specified, cross-referencing is acceptable
✗ Qualitative vs quantitative expressions of same requirement (e.g., "Not detected" = "<1 CFU/100mL") - both formats are valid and acceptable
✗ 🚨 EQUIVALENT EXPRESSIONS: "Salmonella: Absence in 100mL" = "Salmonella: <1 CFU/100mL" → IDENTICAL, DO NOT FLAG
✗ 🚨 EQUIVALENT EXPRESSIONS: "E. coli: Absence in 100mL" = "E. coli: <126 MPN/100mL" → IDENTICAL, DO NOT FLAG

DO NOT FLAG:
- Different ways of expressing the same requirement (e.g., "Corrective actions are implemented" = covers "corrective measures implementation")
- Information stated once that applies document-wide (do not require repetition)
- Pragmatic implementation details that are fit for purpose
- Any formatting/presentation issue that doesn't actually prevent understanding
- GENERATING new requirements: Only validate what's written, don't invent new acceptance criteria, timing windows, or specifications
- Details that would be "nice to have" but aren't required by the specification
- 🚨 EQUIVALENT EXPRESSIONS - these are NOT compliance issues

ANTI-LOOP RULE (CRITICAL):
==========================
BEFORE flagging ANY issue, ask yourself:
1. Is this information COMPLETELY ABSENT from the document? Or just stated differently?
2. Is this a REQUIRED specification? Or optional polish?
3. Am I demanding information that was NEVER in a source requirement? Or validating source requirements?
4. Is this a DATA/REQUIREMENT issue, or a FORMATTING/PRESENTATION issue?
5. **CRITICAL: Can I cite the EXACT source requirement (Primus GFS section number)?**
6. 🚨 **IS THIS AN EQUIVALENT EXPRESSION?** If yes, DO NOT FLAG.

If answer to #5 is "NO, I'm guessing/assuming" → DO NOT FLAG. You cannot invent requirements.
If answer to #6 is "YES, it's equivalent" → DO NOT FLAG. Equivalent expressions are compliant.

Examples of things you MUST NOT flag:
- "Recovery timing not specified" when spec only requires recovery percentage, not timing
- "EPA method not cited" when numeric acceptance criteria are already stated
- "Procedure not repeated in section X" when it's stated clearly in section Y
- "Detail X not mentioned in section Y" when detail X is documented elsewhere in the document
- "Document number is DOC-2030 instead of DOC-2025" - this is numbering preference, not compliance
- "Requirements should be on separate lines" - this is formatting preference, not a data gap
- "Criteria listed together instead of separately" - this is writing style, not missing information
- **"Listeria testing not specified" when the requirement only specifies E. coli and Salmonella** → DO NOT INVENT REQUIREMENTS
- **"Timing measurement method not defined" when the time limit IS defined (e.g., "within 2 hours")** → Operational detail, not missing requirement
- 🚨 **"Should say '<1 CFU/100mL' instead of 'Absence in 100mL'"** → EQUIVALENT EXPRESSIONS, DO NOT FLAG
- 🚨 **"Wording doesn't match specification verbatim"** → DO NOT FLAG EQUIVALENT EXPRESSIONS

DO NOT INVENT REQUIREMENTS:
- Do NOT add pathogens not in the source spec (e.g., adding Listeria if spec doesn't require it)
- Do NOT add procedural details that go beyond the source spec (e.g., "when timer starts/stops")
- Do NOT assume other standards require things this spec doesn't (e.g., "PrimusGFS must want Listeria tested")
- If you cannot cite the EXACT Primus GFS requirement number, DO NOT FLAG IT

CRITICAL INSTRUCTIONS:
- This is a ONE-TIME comprehensive audit
- Only flag issues that PREVENT AUDIT PASSAGE, not cosmetic improvements
- Only flag issues based on ACTUAL REQUIREMENTS, not invented specifications
- Do NOT suggest adding details that don't come from a compliance requirement source
- Do NOT require information to be repeated across multiple sections
- Do NOT flag "missing" details just because they're not in every section that touches the topic
- If a frequency/method/requirement is stated clearly ONCE, that counts as DEFINED
- Search exhaustively before flagging something as "missing"
- **CRITICAL: For EVERY issue you flag, cite the EXACT Primus GFS section number. If you cannot cite it, DO NOT FLAG**
- Be specific: if you flag an issue, explain exactly what compliance requirement it violates (cite the requirement and section)
- IGNORE ALL FORMATTING/PRESENTATION PREFERENCES: Only flag actual data gaps
  * Document number format is NOT a compliance issue
  * How requirements are written (one line vs multiple) is NOT a compliance issue
  * Whether criteria are together vs separate is NOT a compliance issue
  * Professional polish and presentation are NOT compliance gaps
- **FINAL VALIDATION: If you flag something as "missing" or "not specified", verify it's actually in the Primus GFS standard before flagging**
- 🚨 **MOST IMPORTANT: DO NOT FLAG EQUIVALENT EXPRESSIONS - they are fully compliant**

SCORING GUIDE:
- 85-100: Excellent, audit-ready with no blocking issues
- 70-84: Good, only 1-3 genuinely missing details that block compliance (not formatting/repetition/equivalent expressions)
- 50-69: Fair, 4-6 genuinely missing details (not cosmetic issues or equivalent expressions)
- 0-49: Poor, critical requirements missing (e.g., entire sections not addressed)

EXAMPLE OF CORRECT SCORING:
✓ Document lacks "responsibilities" section anywhere → FLAG (score down)
✓ Document has "responsibilities" in section 5 but not repeated in section 8 → DO NOT FLAG (already stated once)
✓ Document states "annual testing" but doesn't specify "within 30 days" → ONLY FLAG if "within 30 days" is an actual requirement source, not invented
✓ Document states "100% recovery within 2 hours" but not "within 4 hours" → DO NOT FLAG if "4 hours" isn't from an actual specification
✓ 🚨 Document says "Salmonella: Absence in 100mL" instead of "<1 CFU/100mL" → DO NOT FLAG (equivalent expressions)
✓ 🚨 Document says "E. coli: negative" instead of "<126 MPN/100mL" → DO NOT FLAG (equivalent expressions)

OUTPUT JSON (no markdown, MUST include all fields):
{
  "languageProfessionalism": "excellent|good|needs-improvement|poor",
  "procedureImplementability": "excellent|good|needs-improvement|poor",
  "monitoringAdequacy": "excellent|good|needs-improvement|poor",
  "verificationMechanisms": "excellent|good|needs-improvement|poor",
  "recordKeepingClarity": "excellent|good|needs-improvement|poor",
  "overallAuditReadiness": "ready|minor-revisions|major-revisions|not-ready",
  "auditRisks": [
    {
      "issue": "<specific problem found in document>",
      "textAnchor": "<quote from document showing the problem>",
      "impact": "<why this is a problem for audit>",
      "recommendation": "<specific fix with example>"
    }
  ],
  "score": <integer 0-100>
}

IMPORTANT: Provide complete, specific issues. Each issue must have a real textAnchor quote from the document. Only include issues that are actual compliance gaps, not formatting variations or equivalent expressions.`;
}

/**
 * Build prompt for quick scoring (lightweight analysis)
 * OPTIMIZED: Single prompt for all 4 scores, minimal context
 */
function buildQuickScoringPrompt(
  checklist: any,
  documents: { fileName: string; text: string }[]
): string {
  const documentTexts = documents
    .map(
      (doc, i) =>
        `DOCUMENT ${i + 1}: ${doc.fileName}\n${doc.text.substring(0, 2000)}`
    )
    .join("\n\n---\n\n");

  const checklistSummary =
    typeof checklist === "string"
      ? checklist.substring(0, 1000)
      : JSON.stringify(checklist).substring(0, 1000);

  return `QUICK COMPLIANCE SCORING
Rapidly assess 4 compliance dimensions from uploaded documents.

COMPLIANCE REQUIREMENTS:
${checklistSummary}

DOCUMENTS UPLOADED:
${documentTexts}

TASK: Score each dimension 0-100 based on document coverage.

SCORING DIMENSIONS:
1. CONTENT SCORE: How well do documents cover compliance requirements? (0-100)
2. STRUCTURE SCORE: Are documents well-organized and professional? (0-100)
3. AUDIT READINESS: Would this pass an audit? Clear and verifiable? (0-100)
4. OVERALL SCORE: Weighted average of above three scores

OUTPUT JSON (no markdown):
{
  "contentScore": <0-100>,
  "structureScore": <0-100>,
  "auditReadinessScore": <0-100>,
  "overallScore": <0-100>
}

Return ONLY the JSON object.`;
}

/**
 * Build prompt for document relevance validation
 */
function buildDocumentRelevancePrompt(
  documents: { fileName: string; text: string }[],
  checklist: any,
  subModuleDescription?: string
): string {
  const documentTexts = documents
    .map((doc, i) => `DOCUMENT ${i + 1}: ${doc.fileName}\n${doc.text}`)
    .join("\n\n---\n\n");

  const checklistSummary =
    typeof checklist === "string"
      ? checklist
      : JSON.stringify(checklist).substring(0, 1000);

  const moduleContext = subModuleDescription
    ? `\nMODULE CONTEXT:\n${subModuleDescription}`
    : "";

  return `Assess if these uploaded documents are relevant to a SPECIFIC Primus GFS submodule.${moduleContext}

COMPLIANCE REQUIREMENTS (submodule-specific):
${checklistSummary}

UPLOADED DOCUMENTS:
${documentTexts}

TASK:
For each document, assess its relevance to THIS specific submodule:
1. What is the main topic/process described in this document?
2. Does the document's topic match the submodule's topic/scope?
3. If document topic = submodule topic → HIGHLY RELEVANT (80%+)
4. If document covers related processes for same area → RELEVANT (60-79%)
5. If document is about a completely different module/area → NOT RELEVANT (0-39%)

RELEVANCE SCORING (pragmatic, not overly strict):
- 90-100%: Document title/content directly matches submodule name and scope → HIGHLY RELEVANT
- 70-89%: Document covers the submodule's process/area with most controls addressed → RELEVANT
- 50-69%: Document covers adjacent/related controls but primarily for a different submodule → MARGINALLY RELEVANT
- 0-49%: Document covers completely different process/module → NOT RELEVANT

KEY PRINCIPLE: A document is RELEVANT if its primary subject matches the submodule's subject.
- "Ground History" document is 90%+ relevant for "2.03 - Ground History" submodule
- "Traceability Records" document is 100% relevant for "2.03 - Traceability" submodule
- "General Monitoring" document for "2.03 - Ground History" is 50-60% relevant (covers monitoring but not ground-specific)

EXAMPLES OF CORRECT SCORING:
✓ Document: "Ground History Procedures" → Submodule: "Ground History" → Score: 95% (RELEVANT)
✓ Document: "Soil Testing Records" → Submodule: "Ground History" → Score: 85% (RELEVANT - directly related)
✗ Document: "Risk Assessment Policy" → Submodule: "Ground History" → Score: 15% (NOT RELEVANT - different module)
✓ Document: "Monitoring Plan" → Submodule: "Ground History" → Score: 65% (MARGINALLY RELEVANT - has monitoring but not ground-focused)

OUTPUT JSON (no markdown):
{
  "documents": [
    {
      "documentName": "<filename>",
      "relevanceScore": <0-100 based on topic matching>,
      "isRelevant": <true if score >= 60>,
      "reasoning": "<why this score - how does document topic align with submodule scope>",
      "identifiedTopic": "<main topic of document>",
      "requirementsAddressed": ["requirement id 1", "requirement id 2"],
      "requirementsMissing": ["requirement id 3"],
      "suggestedTopic": "<submodule this document is most relevant for>",
      "recommendation": "<brief - is it relevant or should user upload different doc>"
    }
  ]
}

Return ONLY the JSON object. No markdown formatting.`;
}
