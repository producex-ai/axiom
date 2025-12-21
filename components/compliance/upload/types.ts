/**
 * Flow steps for the evidence upload dialog
 */
export type FlowStep = "upload" | "analyzing" | "results" | "error";

/**
 * Represents an uploaded evidence document
 */
export interface Evidence {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

/**
 * Lightweight analysis response for upload + analyze flow
 * ONLY returned during initial upload/analyze, not full deep analysis
 * Includes action flags to enable UI buttons for Auto-Complete/Accept
 */
export interface SummaryAnalysisResult {
  overallScore: number;
  contentScore: number;
  structureScore: number;
  auditReadinessScore: number;
  analysisId?: string;
  // Include relevance check in summary
  documentRelevance?: {
    analysisBlocked: boolean;
    issues: Array<{
      documentName: string;
      relevanceScore: number;
      suggestedTopic: string;
      reasoning: string;
      recommendation: string;
    }>;
  };
  // Include action flags for UI buttons
  canImprove?: boolean;
  shouldGenerateFromScratch?: boolean;
}

/**
 * Full analysis result for deep compliance analysis
 * Contains all detailed information
 */
export interface FullAnalysisResult {
  overallScore: number;
  contentScore: number;
  structureScore: number;
  auditReadinessScore: number;
  covered: { count: number };
  partial: { count: number };
  missing: { count: number };
  canImprove: boolean;
  canMerge: boolean;
  shouldGenerateFromScratch: boolean;
  documentRelevance?: {
    analysisBlocked: boolean;
    issues: Array<{
      documentName: string;
      relevanceScore: number;
      suggestedTopic: string;
      reasoning: string;
      recommendation: string;
    }>;
  };
  risks?: Array<{
    description: string;
    severity: "high" | "medium" | "low";
    recommendation: string;
  }>;
  analysisId?: string;
}

/**
 * Union type for analysis results
 * Use SummaryAnalysisResult for upload flow, FullAnalysisResult for deep analysis
 */
export type AnalysisResult = SummaryAnalysisResult | FullAnalysisResult;

/**
 * Validation error types
 */
export enum ValidationError {
  FILE_TOO_LARGE = "File size exceeds maximum limit (10MB)",
  INVALID_FILE_TYPE = "Only DOCX files are allowed",
  MAX_FILES_EXCEEDED = "Maximum 3 files allowed",
  EMPTY_FILE = "File is empty",
}

/**
 * API response types
 */
export interface ApiErrorResponse {
  error?: string;
  details?: string;
  message?: string;
}

