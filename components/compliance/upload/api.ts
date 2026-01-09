import { toast } from "sonner";
import { Evidence } from "./types";

/**
 * Error handler for API responses
 */
const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
};

/**
 * Fetch existing evidence for a submodule
 */
export const fetchExistingEvidence = async (
  subModuleId: string
): Promise<Evidence[]> => {
  try {
    const response = await fetch(`/api/evidence?subModuleId=${subModuleId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch evidence: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.evidence || !Array.isArray(data.evidence)) {
      return [];
    }

    return data.evidence.map((e: any) => ({
      id: e.id,
      fileName: e.fileName,
      fileSize: e.fileSize,
      uploadedAt: e.uploadedAt,
    }));
  } catch (error) {
    console.error("Failed to fetch existing evidence:", error);
    return [];
  }
};

/**
 * Upload files to the server
 */
export const uploadFiles = async (
  files: File[],
  subModuleId: string,
  onProgress: (progress: number) => void
): Promise<Evidence[]> => {
  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("subModuleId", subModuleId);

  const response = await fetch("/api/evidence/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Upload failed");
  }

  onProgress(100);
  return data.uploadedEvidence || [];
};

/**
 * Delete evidence by ID
 */
export const deleteEvidence = async (evidenceId: string): Promise<void> => {
  if (!evidenceId) {
    throw new Error("Evidence ID is required");
  }

  const response = await fetch(`/api/evidence/${evidenceId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || "Failed to delete evidence");
  }
};

/**
 * Analyze compliance for uploaded evidence
 * Returns LIGHTWEIGHT summary analysis (only 4 scores) for upload flow
 * The full detailed analysis is stored in the database and can be fetched later
 */
export const analyzeCompliance = async (subModuleId: string) => {
  if (!subModuleId) {
    throw new Error("SubModule ID is required");
  }

  const response = await fetch("/api/compliance/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subModuleId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Analysis failed");
  }

  return data;
};

/**
 * Merge multiple documents
 */
export const mergeDocuments = async (subModuleId: string) => {
  if (!subModuleId) {
    throw new Error("SubModule ID is required");
  }

  const response = await fetch("/api/compliance/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subModuleId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Merge failed");
  }

  return data;
};

/**
 * Improve document with AI-generated sections
 */
export const improveDocument = async (
  subModuleId: string,
  analysisId: string,
  renewal?: string
) => {
  if (!subModuleId || !analysisId) {
    throw new Error("SubModule ID and Analysis ID are required");
  }

  const response = await fetch("/api/compliance/improve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subModuleId, analysisId, renewal, docType: 'compliance' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Improvement failed");
  }

  return data;
};

/**
 * Accept and save a document
 */
export const acceptDocument = async (
  subModuleId: string,
  analysisId: string,
  renewal?: string
) => {
  if (!subModuleId || !analysisId) {
    throw new Error("SubModule ID and Analysis ID are required");
  }

  const response = await fetch("/api/compliance/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subModuleId, analysisId, renewal, docType: 'compliance' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Failed to accept document");
  }

  return data;
};

