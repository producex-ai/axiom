/**
 * React Query hooks for Primus GFS compliance data
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FrameworkOverview {
  isOnboarded: boolean;
  frameworkId: string;
  frameworkName: string;
  frameworkVersion: string;
  modules: ModuleWithState[];
}

export interface ModuleWithState {
  module: string;
  moduleName: string;
  enabled: boolean;
  totalSubModules: number;
  documentsCreated: number;
  documentsReady: number;
  submodules: SubModuleWithState[];
}

export interface SubModuleWithState {
  code: string;
  name: string;
  alias?: string;
  hasSubSubModules?: boolean;
  questionsCount?: number;
  totalPoints?: number;
  document?: {
    id: string;
    status: "draft" | "published" | "archived";
    title: string;
    contentKey: string;
    version: number;
    analysisScore?: {
      overallScore?: number;
      contentScore?: number;
      structureScore?: number;
      auditReadinessScore?: number;
    } | null;
    updatedBy?: string | null;
    updatedAt?: string;
  };
  subSubModules?: SubModuleWithState[];
}

/**
 * User profile for display purposes
 */
export interface UserDisplayProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

/**
 * Query key factory for consistent cache keys
 */
export const complianceKeys = {
  all: ["compliance"] as const,
  overview: () => [...complianceKeys.all, "overview"] as const,
  modules: () => [...complianceKeys.all, "modules"] as const,
  allDocuments: () => [...complianceKeys.all, "all-documents"] as const,
  userProfile: (userId: string) => [...complianceKeys.all, "user", userId] as const,
  evidence: () => [...complianceKeys.all, "evidence"] as const,
  evidenceByModule: (subModuleId: string) => [...complianceKeys.evidence(), subModuleId] as const,
  analyses: () => [...complianceKeys.all, "analyses"] as const,
  analysesByModule: (subModuleId: string) => [...complianceKeys.analyses(), subModuleId] as const,
};

/**
 * Fetch Primus GFS overview data
 */
async function fetchOverview(): Promise<FrameworkOverview> {
  const res = await fetch("/api/frameworks/primus/overview");
  if (!res.ok) {
    throw new Error("Failed to fetch compliance overview");
  }
  return res.json();
}

/**
 * Save module selection
 */
async function saveModules(moduleIds: string[]): Promise<{ success: boolean }> {
  const res = await fetch("/api/frameworks/primus/modules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleIds }),
  });
  if (!res.ok) {
    throw new Error("Failed to save module selection");
  }
  return res.json();
}

/**
 * Hook to fetch compliance overview
 */
export function useComplianceOverview() {
  return useQuery({
    queryKey: complianceKeys.overview(),
    queryFn: fetchOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  });
}

/**
 * Hook to save module selection
 */
export function useSaveModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveModules,
    onSuccess: () => {
      // Invalidate overview query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });
    },
  });
}

/**
 * Fetch document content as Markdown
 */
async function fetchDocumentContent(
  documentId: string,
): Promise<{ content: string; metadata: any }> {
  const res = await fetch(`/api/compliance/documents/${documentId}/content`);
  if (!res.ok) {
    throw new Error("Failed to fetch document content");
  }
  return res.json();
}

/**
 * Save document content
 */
async function saveDocumentContent(params: {
  documentId: string;
  content: string;
  publish: boolean;
}): Promise<{ success: boolean; message: string; version: number }> {
  const res = await fetch(
    `/api/compliance/documents/${params.documentId}/content`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: params.content,
        publish: params.publish,
      }),
    },
  );
  if (!res.ok) {
    throw new Error("Failed to save document");
  }
  return res.json();
}

/**
 * Hook to fetch document content
 */
export function useDocumentContent(documentId: string | null) {
  return useQuery({
    queryKey: [
      ...complianceKeys.all,
      "document",
      documentId,
      "content",
    ] as const,
    queryFn: () => fetchDocumentContent(documentId!),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to save document content
 */
export function useSaveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveDocumentContent,
    onSuccess: (data, variables) => {
      // Invalidate both overview and document content queries
      queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });
      queryClient.invalidateQueries({
        queryKey: [
          ...complianceKeys.all,
          "document",
          variables.documentId,
          "content",
        ],
      });
    },
  });
}

/**
 * Fetch user profile for display
 */
async function fetchUserProfile(userId: string): Promise<UserDisplayProfile> {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch user profile");
  }
  return res.json();
}

/**
 * Hook to fetch user profile
 */
export function useUserProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? complianceKeys.userProfile(userId) : ["user", "none"],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes - user info doesn't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Fetch evidence files for a submodule
 */
async function fetchEvidence(subModuleId: string): Promise<{ evidence: any[]; maxAllowed: number }> {
  const res = await fetch(`/api/evidence?subModuleId=${encodeURIComponent(subModuleId)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch evidence");
  }
  return res.json();
}

/**
 * Hook to fetch evidence for a submodule
 */
export function useEvidence(subModuleId: string | null) {
  return useQuery({
    queryKey: subModuleId ? complianceKeys.evidenceByModule(subModuleId) : ["evidence", "none"],
    queryFn: () => fetchEvidence(subModuleId!),
    enabled: !!subModuleId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch compliance analysis history for a submodule
 */
async function fetchComplianceHistory(subModuleId: string): Promise<{ analyses: any[] }> {
  const res = await fetch(`/api/compliance/history?subModuleId=${encodeURIComponent(subModuleId)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch compliance history");
  }
  return res.json();
}

/**
 * Hook to fetch compliance analysis history
 */
export function useComplianceHistory(subModuleId: string | null) {
  return useQuery({
    queryKey: subModuleId ? complianceKeys.analysesByModule(subModuleId) : ["analyses", "none"],
    queryFn: () => fetchComplianceHistory(subModuleId!),
    enabled: !!subModuleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch all documents for an organization
 */
async function fetchAllDocuments(): Promise<{ documents: any[]; count: number }> {
  const res = await fetch("/api/compliance/all-documents");
  if (!res.ok) {
    throw new Error("Failed to fetch documents");
  }
  return res.json();
}

/**
 * Hook to fetch all documents
 */
export function useAllDocuments() {
  return useQuery({
    queryKey: complianceKeys.allDocuments(),
    queryFn: fetchAllDocuments,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}