/**
 * Audit Results Panel Component
 *
 * Collapsible panel displaying audit validation results.
 * - Persistent visibility while editing
 * - Users can reference risks in real-time
 * - Auto-expands when issues are detected
 * - Clean, compact design with severity indicators
 */

"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AuditResultsPanelProps {
  risks: Array<{ severity: string; description: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditResultsPanel({
  risks,
  isOpen,
  onClose,
}: AuditResultsPanelProps) {
  const [expanded, setExpanded] = useState(isOpen);

  // Auto-expand when there are risks
  useEffect(() => {
    if (risks.length > 0 && !expanded) {
      setExpanded(true);
    }
  }, [risks.length, expanded]);

  if (!isOpen || risks.length === 0) {
    return null;
  }

  const highRisksCount = risks.filter((r: any) => r.severity === "high").length;
  const mediumRisksCount = risks.filter(
    (r: any) => r.severity === "medium",
  ).length;
  const lowRisksCount = risks.filter((r: any) => r.severity === "low").length;

  return (
    <div className="sticky top-0 z-40 border-b bg-gradient-to-r from-orange-50 to-orange-50/50 shadow-sm">
      <div className="container mx-auto px-4">
        {/* Collapsible Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-3 hover:bg-orange-100/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-gray-900">
                Identified Risks ({risks.length})
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {highRisksCount > 0 && `${highRisksCount} high, `}
                {mediumRisksCount > 0 && `${mediumRisksCount} medium, `}
                {lowRisksCount} low
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-gray-600 transition-transform flex-shrink-0 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="border-t border-orange-200 pb-4">
            <div className="max-h-96 overflow-y-auto space-y-3 pt-3 px-1">
              {risks.map((risk: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg p-4 border border-orange-200 bg-gradient-to-r from-orange-50 to-orange-50/50 hover:border-orange-300 transition-colors"
                >
                  <p className="font-semibold text-sm text-gray-900">
                    {risk.description}
                  </p>
                  <Badge
                    className={`mt-3 capitalize text-xs ${
                      risk.severity === "high"
                        ? "bg-red-600 hover:bg-red-700"
                        : risk.severity === "medium"
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-yellow-600 hover:bg-yellow-700"
                    }`}
                  >
                    {risk.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
