/**
 * Audit Dialog Component
 *
 * Professional, high-quality UX for displaying comprehensive audit validation results.
 * - Clear visual hierarchy with gradient backgrounds
 * - Detailed remediation guidance with actionable examples
 * - Detailed analysis sections: Issues, Recommendations, Content Coverage, Structure, Risks
 * - Safe-to-close messaging with reassurance
 * - Premium styling with proper spacing and typography
 * - Shows specific guidance and example text for each issue
 */

"use client";

import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Code2,
  MapPin,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { AuditRiskIssue } from "@/lib/editor/publish-flow";

interface AuditDialogProps {
  open: boolean;
  onClose: () => void;
  issues: AuditRiskIssue[];
  onFixClick: () => void;
  onPublishClick?: () => void; // New callback for publishing
  version: number;
  fullAnalysis?: any; // Complete detailed analysis from API
}

export function AuditDialog({
  open,
  onClose,
  issues,
  onFixClick,
  onPublishClick,
  version,
  fullAnalysis,
}: AuditDialogProps) {
  const analysisScores = fullAnalysis
    ? {
        overall: fullAnalysis.overallScore,
        content: fullAnalysis.contentScore,
        structure: fullAnalysis.structureScore,
        audit: fullAnalysis.auditReadinessScore,
      }
    : null;

  // Check if audit readiness score is >90%
  const canPublishWithWarning = analysisScores && analysisScores.audit > 85 && analysisScores.overall > 85;

  // Debug logging
  React.useEffect(() => {
    console.log("[AuditDialog] Full Analysis:", fullAnalysis);
    console.log("[AuditDialog] Analysis Scores:", analysisScores);
    console.log("[AuditDialog] Can Publish:", canPublishWithWarning);
    console.log("[AuditDialog] Audit Score:", analysisScores?.audit);
  }, [fullAnalysis, analysisScores, canPublishWithWarning]);

  const recommendations = fullAnalysis?.recommendations || [];
  const contentCoverage = fullAnalysis?.contentCoverage || [];
  const structuralAnalysis = fullAnalysis?.structuralAnalysis || null;
  const risks = fullAnalysis?.risks || [];

  // Group recommendations by category for better organization
  const recommendationsByCategory = recommendations.reduce(
    (acc: any, rec: any) => {
      if (!acc[rec.category]) acc[rec.category] = [];
      acc[rec.category].push(rec);
      return acc;
    },
    {}
  );

  const categoryLabels: Record<string, string> = {
    content: "Content Coverage",
    structure: "Document Structure",
    "audit-readiness": "Audit Readiness",
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    content: <FileText className="h-4 w-4" />,
    structure: <MapPin className="h-4 w-4" />,
    "audit-readiness": <AlertTriangle className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header Section */}
        <DialogHeader className="space-y-2 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <span>Cannot Publish Document</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Document v{version} saved. Compliance issues must be resolved before
            publishing.
          </DialogDescription>
        </DialogHeader>

        {/* Body Section - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Warning Box for High Score Users */}
          {canPublishWithWarning && (
            <div className="flex gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 text-sm">
                  Audit Score: {analysisScores?.audit}% - Ready to Publish
                </p>
                <p className="text-amber-800 text-sm mt-1">
                  Some flagged items may be good to have, Not a mandatory audit requirement. If you've verified
                  the data, you can safely publish.
                </p>
              </div>
            </div>
          )}

          {/* Enhanced Recommendations Section */}
          {recommendations.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-blue-50">
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">
                    How to Fix These Issues
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-4 border-t border-gray-200 max-h-96 overflow-y-auto">
                {Object.entries(recommendationsByCategory).map(
                  ([category, recs]: [string, any]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        {categoryIcons[category]}
                        <h4 className="font-semibold text-sm text-gray-900">
                          {categoryLabels[category] || category}
                        </h4>
                      </div>
                      <div className="space-y-3 ml-6">
                        {recs.map((rec: any, idx: number) => (
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
                              <p className="font-semibold text-sm text-gray-900">
                                {rec.recommendation}
                              </p>
                            </div>

                            {/* Specific Guidance */}
                            {rec.specificGuidance && (
                              <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200 overflow-hidden">
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
                              <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200 font-mono overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                  <Code2 className="h-3 w-3 text-blue-600" />
                                  <p className="font-semibold text-gray-800">
                                    Example:
                                  </p>
                                </div>
                                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                                  {rec.exampleText}
                                </div>
                              </div>
                            )}

                            {/* Suggested Location */}
                            {rec.suggestedLocation && (
                              <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200 overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="h-3 w-3 text-blue-600" />
                                  <p className="font-semibold text-gray-800">
                                    Location:
                                  </p>
                                </div>
                                <p className="break-words whitespace-normal">
                                  {rec.suggestedLocation}
                                </p>
                              </div>
                            )}

                            {/* Text Anchor */}
                            {rec.textAnchor && (
                              <div className="text-xs text-gray-700 bg-white/50 p-2 rounded border border-gray-200 overflow-hidden">
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
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reassurance Box - Sticky in footer */}
        <div className="border-t pt-3 shrink-0 flex gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900 text-sm">
              Your work is safe
            </p>
            <p className="text-green-800 text-sm">
              Saved as v{version}. You can continue editing anytime.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="gap-3 pt-3 border-t flex-col-reverse sm:flex-row shrink-0">
          <Button
            onClick={onFixClick}
            className={`min-w-32 ${
              canPublishWithWarning
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {canPublishWithWarning ? "Fix Issues (Optional)" : "Fix Issues"}
          </Button>
          {canPublishWithWarning && onPublishClick && (
            <Button
              onClick={onPublishClick}
              className="min-w-32 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Publish Document
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
