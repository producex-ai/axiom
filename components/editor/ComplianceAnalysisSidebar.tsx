/**
 * Compliance Analysis Sidebar Component
 *
 * Displays comprehensive audit validation results as a persistent sidebar.
 * - Overall score with summary
 * - Warning box for high-scoring documents
 * - Detailed recommendations with guidance, examples, and locations
 * - Reassurance messaging with safe-to-close actions
 * - Matches the exact styling and content of AuditDialog
 */

"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ComplianceAnalysisSidebarProps {
  open: boolean;
  onClose: () => void;
  auditAnalysis: any;
  documentVersion?: number;
  onPublishClick: () => void;
}

export const ComplianceAnalysisSidebar = ({
  open,
  onClose,
  auditAnalysis,
  documentVersion,
  onPublishClick,
}: ComplianceAnalysisSidebarProps) => {
  if (!open || !auditAnalysis) return null;

  const canPublishWithWarning =
    auditAnalysis.auditReadinessScore >= 85 &&
    auditAnalysis.overallScore >= 85;

  return (
    <aside className="fixed right-0 top-0 h-screen w-[500px] border-l bg-background shadow-lg z-50 flex flex-col">
      {/* Sidebar Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h2 className="font-semibold text-xl">Compliance Analysis</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          ✕
        </Button>
      </div>

      {/* Sidebar Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Overall Score */}
        {auditAnalysis.overallScore !== undefined && (
          <div className="rounded-lg border border-gray-200 p-4 bg-white">
            <div className="text-sm text-gray-600 mb-1">Overall Score</div>
            <div className="text-4xl font-bold text-gray-900">
              {auditAnalysis.overallScore}/100
            </div>
            {auditAnalysis.summary && (
              <p className="text-sm text-gray-600 mt-2">
                {auditAnalysis.summary}
              </p>
            )}
          </div>
        )}

        {/* Warning Box for High Score Users */}
        {canPublishWithWarning && (
          <div className="flex gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900 text-sm">
                Audit Score: {auditAnalysis.auditReadinessScore}% - Ready to
                Publish
              </p>
              <p className="text-amber-800 text-sm mt-1">
                Some flagged items may be good to have, Not a mandatory audit
                requirement. If you've verified the data, you can safely
                publish.
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Recommendations Section */}
        {auditAnalysis.recommendations &&
          auditAnalysis.recommendations.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-blue-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">
                    Issues Found ({auditAnalysis.recommendations.length})
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 border-t border-gray-200">
                {auditAnalysis.recommendations.map((rec: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg p-3 border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50/50 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <Badge
                        className={`mt-0.5 capitalize text-xs ${
                          rec.priority === "high"
                            ? "bg-red-600"
                            : rec.priority === "medium"
                              ? "bg-orange-600"
                              : "bg-yellow-600"
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">
                          Issue
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          {rec.recommendation}
                        </p>
                      </div>
                    </div>

                    {/* Specific Guidance */}
                    {rec.specificGuidance && (
                      <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200">
                        <p className="font-semibold text-gray-800 mb-1">
                          Guidance:
                        </p>
                        <p className="break-words whitespace-normal">
                          {rec.specificGuidance}
                        </p>
                      </div>
                    )}

                    {/* Example Text */}
                    {rec.exampleText && (
                      <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200">
                        <p className="font-semibold text-gray-800 mb-1">
                          Example:
                        </p>
                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed break-words font-mono">
                          {rec.exampleText}
                        </div>
                      </div>
                    )}

                    {/* Suggested Location */}
                    {rec.suggestedLocation && (
                      <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200">
                        <p className="font-semibold text-gray-800 mb-1">
                          Location:
                        </p>
                        <p className="break-words whitespace-normal">
                          {rec.suggestedLocation}
                        </p>
                      </div>
                    )}

                    {/* Text Anchor */}
                    {rec.textAnchor && (
                      <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200">
                        <p className="font-semibold text-gray-800 mb-1">
                          Found in document:
                        </p>
                        <p className="italic text-gray-600 break-words whitespace-normal">
                          "{rec.textAnchor}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* No Issues */}
        {(!auditAnalysis.recommendations ||
          auditAnalysis.recommendations.length === 0) && (
          <div className="rounded-lg border border-gray-200 p-4 bg-white text-center">
            <div className="text-green-600 mb-2 text-2xl">✓</div>
            <p className="text-sm text-gray-600">No critical issues found</p>
          </div>
        )}
      </div>

      {/* Reassurance Box - Sticky Footer */}
      <div className="border-t px-6 py-3 bg-background shrink-0">
        <div className="flex gap-2 mb-3">
          <AlertCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900 text-sm">
              Your work is safe
            </p>
            <p className="text-green-800 text-sm">
              Saved as v{documentVersion}. You can continue editing anytime.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onClose}
          >
            {canPublishWithWarning ? "Close" : "Fix Issues"}
          </Button>
          {canPublishWithWarning && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={onPublishClick}
            >
              Publish Document
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
};
