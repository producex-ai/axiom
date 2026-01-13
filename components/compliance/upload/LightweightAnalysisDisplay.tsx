"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { SummaryAnalysisResult } from "./types";

interface LightweightScoreSummaryProps {
  analysis: SummaryAnalysisResult;
}

/**
 * Lightweight display for upload + analyze flow
 * Shows ONLY the 4 summary scores, not detailed analysis
 */
export const LightweightScoreSummary: React.FC<
  LightweightScoreSummaryProps
> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 50) {
      return "text-emerald-600 dark:text-emerald-400";
    } else if (score >= 30) {
      return "text-amber-600 dark:text-amber-400";
    } else {
      return "text-red-600 dark:text-red-400";
    }
  };

  // Generate contextual next steps message based on analysis results
  const getNextStepsMessage = () => {
    const hasRelevanceIssues = !analysis.documentRelevance?.allRelevant;
    const canImprove = analysis.canImprove;
    const shouldGenerate = analysis.shouldGenerateFromScratch;
    const canMerge = analysis.canMerge;

    // If there are relevance issues, prioritize that
    if (hasRelevanceIssues) {
      return "Some documents may not be relevant to this module. Review the relevance issues below, then Accept valid documents or upload corrected files.";
    }

    // Build available actions list
    const actions: string[] = ["Accept"];
    if (canMerge) actions.push("Merge");
    if (canImprove) actions.push("Improve");
    if (shouldGenerate) actions.push("Generate from scratch");

    const actionsList =
      actions.length > 1
        ? `${actions.slice(0, -1).join(", ")}, or ${actions[actions.length - 1]}`
        : actions[0];

    return `View detailed analysis and choose actions like ${actionsList} from main screen.`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/30">
      <p className="mb-6 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
        Compliance Scores
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Overall Score
          </p>
          <p
            className={`text-3xl font-bold ${getScoreColor(analysis.overallScore)}`}
          >
            {analysis.overallScore}%
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Content
          </p>
          <p
            className={`text-3xl font-bold ${getScoreColor(analysis.contentScore)}`}
          >
            {analysis.contentScore}%
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Structure
          </p>
          <p
            className={`text-3xl font-bold ${getScoreColor(analysis.structureScore)}`}
          >
            {analysis.structureScore}%
          </p>
        </div>
      </div>

      <div
        className={`mt-6 p-4 rounded-lg border ${
          !analysis.documentRelevance?.allRelevant
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
            : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
        }`}
      >
        <p
          className={`text-xs ${
            !analysis.documentRelevance?.allRelevant
              ? "text-amber-900 dark:text-amber-200"
              : "text-blue-900 dark:text-blue-200"
          }`}
        >
          <span className="font-semibold">Next Steps:</span>{" "}
          {getNextStepsMessage()}
        </p>
      </div>
    </div>
  );
};

interface RelevanceWarningProps {
  isBlocked: boolean;
  analysisId?: string;
}

/**
 * Display relevance warning for upload flow
 */
export const RelevanceWarning: React.FC<RelevanceWarningProps> = ({
  isBlocked,
  analysisId,
}) => {
  if (!isBlocked) return null;

  return (
    <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50">
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      <AlertDescription className="text-red-900 dark:text-red-100">
        <span className="font-medium">
          Documents may not be relevant to this module.
        </span>{" "}
        Please verify the uploaded documents match this compliance requirement.
      </AlertDescription>
    </Alert>
  );
};

interface SuccessMessageProps {
  documentCount: number;
  hasRelevanceIssues?: boolean;
  relevantCount?: number;
}

/**
 * Success message after analysis
 */
export const AnalysisSuccessMessage: React.FC<SuccessMessageProps> = ({
  documentCount,
  hasRelevanceIssues = false,
  relevantCount,
}) => {
  // Show warning style if there are relevance issues
  if (hasRelevanceIssues) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Analysis Complete - Relevance Issues Detected
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            {documentCount} document{documentCount !== 1 ? "s" : ""} analyzed.
            {relevantCount !== undefined && relevantCount < documentCount && (
              <>
                {" "}
                Only {relevantCount} of {documentCount} document
                {documentCount !== 1 ? "s" : ""} appear
                {relevantCount === 1 ? "s" : ""} relevant to this module.
              </>
            )}{" "}
            Please review the issues below and either remove irrelevant
            documents or upload corrected files before accepting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-emerald-900 dark:text-emerald-100">
          Analysis Complete
        </p>
        <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
          {documentCount} document{documentCount !== 1 ? "s" : ""} analyzed
          successfully. Review the scores below and choose your next action.
        </p>
      </div>
    </div>
  );
};
