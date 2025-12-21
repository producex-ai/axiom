"use client";

import React from "react";
import { Loader2, Sparkles, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FullAnalysisResult, Evidence } from "./types";

interface ResultsStepActionsProps {
  analysis: FullAnalysisResult;
  uploadedEvidence: Evidence[];
  isImproving: boolean;
  isMerging?: boolean; // Kept for backward compatibility but not used
  isResetting?: boolean;
  isAccepting?: boolean;
  onResetClick: () => void;
  onMerge?: () => void; // Kept for backward compatibility but not used
  onImprove: () => void;
  onAccept?: () => void;
}

export const ResultsStepActions: React.FC<ResultsStepActionsProps> = ({
  analysis,
  uploadedEvidence,
  isImproving,
  isResetting = false,
  isAccepting = false,
  onResetClick,
  onImprove,
  onAccept,
}) => {
  const isAnalysisBlocked =
    analysis.documentRelevance?.analysisBlocked === true;
  const canImprove = analysis.canImprove === true;
  const shouldGenerateFromScratch = analysis.shouldGenerateFromScratch === true;
  const isSingleDocument = uploadedEvidence.length === 1;

  return (
    <div className="flex-shrink-0 space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
      {/* Reset Button */}
      <Button
        variant="outline"
        onClick={onResetClick}
        disabled={isResetting || isImproving}
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50"
      >
        <RotateCw className={`mr-2 h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
        {isResetting ? "Resetting..." : "Reset & Upload New"}
      </Button>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isAnalysisBlocked ? (
          <Button
            onClick={onResetClick}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Upload Relevant Documents
          </Button>
        ) : shouldGenerateFromScratch ? (
          <>
            <Button
              variant="outline"
              onClick={onResetClick}
              className="flex-1"
            >
              Upload More Documents
            </Button>
            <Button
              onClick={() => {
                toast.info("Generate from scratch feature coming soon");
              }}
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate from Scratch
            </Button>
          </>
        ) : isSingleDocument ? (
          // SINGLE DOCUMENT: Show Auto-Complete + Accept & Save
          <>
            {onAccept && (
              <Button
                onClick={onAccept}
                disabled={isAccepting || isImproving}
                variant="outline"
                className="flex-1"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Accept & Save"
                )}
              </Button>
            )}
            {canImprove && (
              <Button
                onClick={onImprove}
                disabled={isImproving || isAccepting}
                className="flex-1"
              >
                {isImproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Auto-Complete Documentation
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          // MULTIPLE DOCUMENTS: Show only Auto-Complete
          <>
            {canImprove && (
              <Button
                onClick={onImprove}
                disabled={isImproving}
                className="flex-1"
              >
                {isImproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Auto-Complete Documentation
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
