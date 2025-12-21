"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { AnalysisResult } from "./types";

interface RelevanceIssuesProps {
  issues: Array<{
    documentName: string;
    relevanceScore: number;
    suggestedTopic: string;
    reasoning: string;
    recommendation: string;
  }>;
  expandedIndex: number | null;
  onToggleExpand: (index: number | null) => void;
}

export const RelevanceIssues: React.FC<RelevanceIssuesProps> = ({
  issues,
  expandedIndex,
  onToggleExpand,
}) => {
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">
        ⚠️ Document Relevance Issues ({issues.length})
      </p>
      {issues.map((issue, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
        >
          <button
            onClick={() =>
              onToggleExpand(expandedIndex === idx ? null : idx)
            }
            className="w-full px-4 py-3 flex items-start justify-between gap-3 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1 text-left">
              <div className="mt-0.5 flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border border-amber-300 dark:border-amber-800">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {issue.relevanceScore}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-amber-900 dark:text-amber-100 truncate">
                  {issue.documentName}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  {issue.suggestedTopic}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 text-amber-900 dark:text-amber-100">
              {expandedIndex === idx ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          {expandedIndex === idx && (
            <div className="px-4 pb-3 space-y-2 border-t border-amber-200 dark:border-amber-900/50">
              <div>
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  Issue:
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  {issue.reasoning}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  Recommendation:
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  {issue.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface RelevanceBlockedAlertProps {
  isBlocked: boolean;
}

export const RelevanceBlockedAlert: React.FC<RelevanceBlockedAlertProps> = ({
  isBlocked,
}) => {
  if (!isBlocked) return null;

  return (
    <Alert
      variant="destructive"
      className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50"
    >
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <span className="font-medium">
          Analysis blocked due to document relevance issues.
        </span>
        <span className="block text-xs mt-1">
          Please replace documents that don't match this compliance module with
          relevant ones.
        </span>
      </AlertDescription>
    </Alert>
  );
};
