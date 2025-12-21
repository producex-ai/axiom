"use client";

import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Evidence } from "./types";

interface UploadStepActionsProps {
  selectedFiles: File[];
  uploadedEvidence: Evidence[];
  uploadProgress: number;
  isAnalyzing: boolean;
  isResetting?: boolean;
  isLoadingEvidence?: boolean;
  onUploadFiles: () => void;
  onAnalyze: () => void;
  onResetClick: () => void;
  onCombinedAnalyze: () => void; // New: combined upload + analyze
}

export const UploadStepActions: React.FC<UploadStepActionsProps> = ({
  selectedFiles,
  uploadedEvidence,
  uploadProgress,
  isAnalyzing,
  isResetting = false,
  isLoadingEvidence = false,
  onUploadFiles,
  onAnalyze,
  onResetClick,
  onCombinedAnalyze,
}) => {
  // Only show one primary CTA: "Analyze Compliance"
  // This combines upload + analysis in a single action
  const canAnalyze = selectedFiles.length > 0 && !isAnalyzing && uploadProgress === 0;

  return (
    <div className="flex-shrink-0 space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
      {/* Reset Button - shown when user has selected files multiple times */}
      {uploadedEvidence.length > 0 && selectedFiles.length > 0 && (
        <Button
          variant="outline"
          onClick={onResetClick}
          disabled={isResetting || uploadProgress > 0 || isLoadingEvidence}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset & Start Over"
          )}
        </Button>
      )}

      {/* Primary CTA: Single "Analyze Compliance" button */}
      {/* This button handles both file upload and compliance analysis */}
      <Button
        onClick={onCombinedAnalyze}
        disabled={!canAnalyze}
        className="w-full"
      >
        {isAnalyzing || uploadProgress > 0 ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadProgress > 0 && uploadProgress < 100
              ? "Uploading & Analyzing..."
              : "Analyzing..."}
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Analyze Compliance
          </>
        )}
      </Button>

      {/* Helper text for UX clarity */}
      {selectedFiles.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Select up to 3 documents to analyze
        </p>
      )}
    </div>
  );
};
