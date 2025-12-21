"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { complianceKeys } from "@/lib/compliance/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import modular components and utilities
import { ConfirmationDialog } from "./ConfirmationDialog";
import { ResetConfirmationSection } from "./ResetConfirmationSection";
import { UploadZone } from "./UploadZone";
import { UploadStepActions } from "./UploadStepActions";
import {
  RelevanceBlockedAlert,
  RelevanceIssues,
} from "./RelevanceSection";
import {
  ScoreSummary,
  CoverageBreakdown,
  LowScoreWarning,
  RisksSection,
} from "./AnalysisDisplay";
import {
  LightweightScoreSummary,
  RelevanceWarning,
  AnalysisSuccessMessage,
} from "./LightweightAnalysisDisplay";
import { ResultsStepActions } from "./ResultsStepActions";
import {
  validateFile,
  validateFileCount,
  formatFileSize,
} from "./fileUtils";
import {
  fetchExistingEvidence,
  uploadFiles,
  deleteEvidence,
  analyzeCompliance,
  mergeDocuments,
  improveDocument,
  acceptDocument,
} from "./api";
import {
  FlowStep,
  Evidence,
  AnalysisResult,
  SummaryAnalysisResult,
  FullAnalysisResult,
} from "./types";

interface EvidenceUploadFlowProps {
  open: boolean;
  onClose: () => void;
  subModuleId: string;
  subModuleName: string;
  onAnalysisComplete?: (analysisId: string, analysis: any) => void;
}

export default function EvidenceUploadFlow({
  open,
  onClose,
  subModuleId,
  subModuleName,
  onAnalysisComplete,
}: EvidenceUploadFlowProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<FlowStep>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedEvidence, setUploadedEvidence] = useState<Evidence[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [analysisId, setAnalysisId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [expandedRelevanceIssue, setExpandedRelevanceIssue] = useState<
    number | null
  >(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Reset state when dialog opens/closes
  // STATELESS MODAL: Do NOT fetch existing evidence on reopen
  // All state is session-scoped and cleared on close
  useEffect(() => {
    if (open) {
      setCurrentStep("upload");
      setSelectedFiles([]);
      setUploadProgress(0);
      setUploadedEvidence([]); // Clear any uploaded files on modal reopen
      setAnalysisResult(null);
      setAnalysisId("");
      setErrorMessage("");
      setIsAnalyzing(false);
      setIsMerging(false);
      setIsImproving(false);
      setIsAccepting(false);
      setShowResetConfirm(false);
      setIsLoadingEvidence(false); // No loading of existing evidence
    }
  }, [open]);

  const handleClose = useCallback(() => {
    // Delete uploaded evidence files when modal closes (whether accepted or not)
    // This ensures clean state for next upload
    if (uploadedEvidence.length > 0) {
      uploadedEvidence.forEach((evidence) => {
        // Call delete endpoint for each uploaded file
        fetch(`/api/evidence/${evidence.id}`, {
          method: "DELETE",
        }).catch((error) => {
          console.warn(`Failed to delete evidence ${evidence.id}:`, error);
        });
      });
    }
    
    onClose();
  }, [uploadedEvidence, onClose]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Validate each file
      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          setErrorMessage(`${file.name}: ${error}`);
          setCurrentStep("error");
          return;
        }
      }

      // Check total file count
      const countError = validateFileCount(selectedFiles.length, files.length);
      if (countError) {
        setErrorMessage(countError);
        setCurrentStep("error");
        return;
      }

      setSelectedFiles([...selectedFiles, ...files]);
      setErrorMessage("");
    },
    [selectedFiles]
  );

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUploadEvidence = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 25;
      });
    }, 200);

    try {
      const evidence = await uploadFiles(
        selectedFiles,
        subModuleId,
        setUploadProgress
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedEvidence(evidence);
      setSelectedFiles([]);

      await queryClient.invalidateQueries({
        queryKey: ["compliance", "evidence", subModuleId],
      });

      toast.success(`${evidence.length} file(s) uploaded successfully`);
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload error:", error);
      clearInterval(progressInterval);
      setUploadProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload evidence"
      );
      setCurrentStep("error");
    }
  }, [selectedFiles, subModuleId, queryClient]);

  const handleAnalyzeCompliance = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeCompliance(subModuleId);
      setAnalysisId(result.analysisId);
      setAnalysisResult(result.analysis);
      setCurrentStep("results");
      toast.success("Compliance analysis completed");
    } catch (error) {
      console.error("Analysis error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to analyze compliance"
      );
      setCurrentStep("error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [subModuleId]);

  /**
   * Combined upload + analyze action
   * NEW: Single CTA that combines file upload and compliance analysis
   * This is the main entry point for the refactored flow
   */
  const handleCombinedAnalyze = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    setUploadProgress(0);

    // Simulate upload progress for UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 25;
      });
    }, 200);

    try {
      // Step 1: Upload files (implementation detail, not shown to user)
      const evidence = await uploadFiles(
        selectedFiles,
        subModuleId,
        setUploadProgress
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Note: We store evidence in state but mark it as TEMPORARY
      // It will NOT be persisted to DB unless user explicitly chooses to
      setUploadedEvidence(evidence);

      // Step 2: Immediately analyze (no separate step)
      const result = await analyzeCompliance(subModuleId);
      setAnalysisId(result.analysisId);
      setAnalysisResult(result.analysis);
      setCurrentStep("results");

      toast.success("Documents analyzed successfully");
    } catch (error) {
      console.error("Analyze error:", error);
      clearInterval(progressInterval);
      setUploadProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to analyze documents"
      );
      setCurrentStep("error");
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(0);
      setSelectedFiles([]);
    }
  }, [selectedFiles, subModuleId]);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      for (const evidence of uploadedEvidence) {
        await deleteEvidence(evidence.id);
      }

      setCurrentStep("upload");
      setSelectedFiles([]);
      setUploadProgress(0);
      setUploadedEvidence([]);
      setAnalysisResult(null);
      setAnalysisId("");
      setErrorMessage("");
      setIsAnalyzing(false);
      setIsMerging(false);
      setIsImproving(false);
      setShowResetConfirm(false);

      // Refresh overview data
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.overview(),
      });
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.evidenceByModule(subModuleId),
      });

      toast.success("Evidence cleared. Ready to upload new documents.");
    } catch (error) {
      console.error("Error during reset:", error);
      toast.error("Failed to reset evidence. Please try again.");
    } finally {
      setIsResetting(false);
    }
  }, [uploadedEvidence, subModuleId, queryClient]);

  const handleMergeDocuments = useCallback(async () => {
    setIsMerging(true);
    try {
      const result = await mergeDocuments(subModuleId);
      toast.success(
        `Documents merged successfully! Document ID: ${result.documentId}`
      );

      await queryClient.invalidateQueries({
        queryKey: complianceKeys.overview(),
      });
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.evidenceByModule(subModuleId),
      });

      handleClose();
    } catch (error) {
      console.error("Merge error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to merge documents"
      );
    } finally {
      setIsMerging(false);
    }
  }, [subModuleId, queryClient, handleClose]);

  const handleImproveDocument = useCallback(async () => {
    setIsImproving(true);
    try {
      const response = await improveDocument(subModuleId, analysisId);

      if (onAnalysisComplete) {
        onAnalysisComplete(analysisId, analysisResult);
      }

      await queryClient.invalidateQueries({
        queryKey: complianceKeys.overview(),
      });
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.evidenceByModule(subModuleId),
      });

      handleClose();
      
      // Show loading toast and redirect to edit page
      if (response.documentId) {
        const loadingToastId = toast.loading("Opening document editor...");
        setTimeout(() => {
          router.push(`/dashboard/compliance/documents/${response.documentId}/edit`);
          toast.dismiss(loadingToastId);
          toast.success("Document ready for editing");
        }, 500);
      } else {
        toast.success("Document improved with AI-generated sections");
      }
    } catch (error) {
      console.error("Improve error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to improve document"
      );
    } finally {
      setIsImproving(false);
    }
  }, [subModuleId, analysisId, analysisResult, onAnalysisComplete, queryClient, handleClose, router]);

  const handleAcceptDocument = useCallback(async () => {
    setIsAccepting(true);
    try {
      const response = await acceptDocument(subModuleId, analysisId);

      if (onAnalysisComplete) {
        onAnalysisComplete(analysisId, analysisResult);
      }

      // Invalidate and refetch overview data in parallel
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: complianceKeys.overview(),
        }),
        queryClient.invalidateQueries({
          queryKey: complianceKeys.evidenceByModule(subModuleId),
        }),
      ]);

      handleClose();
      
      // Show loading toast and redirect to edit page
      if (response.documentId) {
        const loadingToastId = toast.loading("Opening document editor...");
        setTimeout(() => {
          router.push(`/dashboard/compliance/documents/${response.documentId}/edit`);
          toast.dismiss(loadingToastId);
          toast.success("Document ready for editing");
        }, 500);
      } else {
        toast.success("Document saved and attached to module");
      }
    } catch (error) {
      console.error("Accept error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save document"
      );
    } finally {
      setIsAccepting(false);
    }
  }, [subModuleId, analysisId, analysisResult, onAnalysisComplete, queryClient, handleClose, router]);

  // Step 1: Upload Evidence
  if (currentStep === "upload") {
    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="w-full max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Upload Evidence Documents</DialogTitle>
              <DialogDescription>
                Upload up to 3 compliance documents (DOCX) for {subModuleName}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-4">
              <UploadZone
                selectedFiles={selectedFiles}
                uploadedEvidence={uploadedEvidence}
                uploadProgress={uploadProgress}
                errorMessage={errorMessage}
                isLoadingEvidence={isLoadingEvidence}
                onFileSelect={handleFileSelect}
                onFileClick={handleFileClick}
                onRemoveFile={removeFile}
              />
            </div>

            <UploadStepActions
              selectedFiles={selectedFiles}
              uploadedEvidence={uploadedEvidence}
              uploadProgress={uploadProgress}
              isAnalyzing={isAnalyzing}
              isResetting={isResetting}
              isLoadingEvidence={isLoadingEvidence}
              onUploadFiles={handleUploadEvidence}
              onAnalyze={handleAnalyzeCompliance}
              onResetClick={() => setShowResetConfirm(true)}
              onCombinedAnalyze={handleCombinedAnalyze}
            />
          </DialogContent>
        </Dialog>

        <ResetConfirmationSection
          open={showResetConfirm}
          isResetting={isResetting}
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      </>
    );
  }

  // Step 2: Analysis Results
  if (currentStep === "results" && analysisResult) {
    // Determine if this is a summary (from upload flow) or full analysis
    const isSummary = !("covered" in analysisResult);
    const hasRelevanceIssues =
      (analysisResult.documentRelevance?.issues?.length ?? 0) > 0;

    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="w-full max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {isSummary ? "Analysis Results" : "Compliance Analysis Results"}
              </DialogTitle>
              <DialogDescription>
                {subModuleName} - {uploadedEvidence.length} document(s) analyzed
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-4">
              <div className="space-y-6">
                {/* SCORE SUMMARY DISPLAY (always show 4 scores) */}
                <>
                  <AnalysisSuccessMessage documentCount={uploadedEvidence.length} />
                  <RelevanceWarning
                    isBlocked={
                      analysisResult.documentRelevance?.analysisBlocked === true
                    }
                    analysisId={analysisId}
                  />
                  {!analysisResult.documentRelevance?.analysisBlocked && (
                    <LightweightScoreSummary
                      analysis={{
                        overallScore: analysisResult.overallScore,
                        contentScore: analysisResult.contentScore,
                        structureScore: analysisResult.structureScore,
                        auditReadinessScore: analysisResult.auditReadinessScore,
                      }}
                    />
                  )}
                </>

                {/* FULL DETAILED ANALYSIS AVAILABLE ON OTHER SCREENS */}
              </div>
            </div>

            <ResultsStepActions
              analysis={analysisResult as FullAnalysisResult}
              uploadedEvidence={uploadedEvidence}
              isImproving={isImproving}
              isMerging={isMerging}
              isResetting={isResetting}
              isAccepting={isAccepting}
              onResetClick={() => setShowResetConfirm(true)}
              onMerge={handleMergeDocuments}
              onImprove={handleImproveDocument}
              onAccept={handleAcceptDocument}
            />
          </DialogContent>
        </Dialog>

        <ResetConfirmationSection
          open={showResetConfirm}
          isResetting={isResetting}
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      </>
    );
  }

  // Error State
  if (currentStep === "error") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Error
            </DialogTitle>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setCurrentStep("upload");
                setErrorMessage("");
              }}
            >
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
