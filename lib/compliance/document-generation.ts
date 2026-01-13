/**
 * React Query hooks for document generation
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { complianceKeys } from "./queries";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface QuestionItem {
  id: string;
  question: string;
  type: "text" | "boolean" | "date" | "number";
  hint?: string;
  checklistRefs?: string[];
}

export interface QuestionsResponse {
  moduleNumber: string;
  subModuleCode: string;
  questionCount: number;
  coreQuestionCount: number;
  requirementQuestionCount: number;
  questions: QuestionItem[];
}

export interface GenerateDocumentRequest {
  moduleNumber: string;
  subModuleCode: string;
  answers: Record<string, string | boolean>;
  renewal?: string;
}

export interface GenerateDocumentResponse {
  success: boolean;
  documentId: string;
  contentKey: string;
  fileName: string;
  message: string;
  metadata: {
    moduleNumber: string;
    subModuleCode: string;
    subModuleTitle: string;
    requirementsCount: number;
    documentVersion: string;
    validationStatus: string;
  };
}

// ============================================================================
// QUERY KEY FACTORY
// ============================================================================

export const documentGenerationKeys = {
  all: ["document-generation"] as const,
  questions: (moduleNumber: string, subModuleCode: string) =>
    [
      ...documentGenerationKeys.all,
      "questions",
      moduleNumber,
      subModuleCode,
    ] as const,
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch questions for a specific submodule
 */
async function fetchQuestions(
  moduleNumber: string,
  subModuleCode: string,
): Promise<QuestionsResponse> {
  const params = new URLSearchParams({
    moduleNumber,
    subModuleCode,
  });

  const res = await fetch(`/api/compliance/questions?${params}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch questions");
  }

  return res.json();
}

/**
 * Generate document from answers
 */
async function generateDocument(
  request: GenerateDocumentRequest,
): Promise<GenerateDocumentResponse> {
  const res = await fetch("/api/compliance/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, docType: "compliance" }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate document");
  }

  return res.json();
}

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch questions for document generation
 */
export function useGenerateQuestions(
  moduleNumber: string,
  subModuleCode: string,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: documentGenerationKeys.questions(moduleNumber, subModuleCode),
    queryFn: () => fetchQuestions(moduleNumber, subModuleCode),
    enabled: enabled && !!moduleNumber && !!subModuleCode,
    staleTime: 5 * 60 * 1000, // 5 minutes - questions don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Only retry once for questions
  });
}

/**
 * Hook to generate document
 */
export function useGenerateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateDocument,
    onSuccess: () => {
      // Invalidate compliance overview to refresh document status
      queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });
    },
  });
}
