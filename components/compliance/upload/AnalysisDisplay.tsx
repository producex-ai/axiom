"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";
import { FullAnalysisResult } from "./types";

interface ScoreSummaryProps {
  analysis: FullAnalysisResult;
}

export const ScoreSummary: React.FC<ScoreSummaryProps> = ({ analysis }) => {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/30">
      <p className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-400">
        OVERALL COMPLIANCE SCORE
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-5xl font-bold ${
            analysis.overallScore > 85
              ? "text-emerald-600 dark:text-emerald-400"
              : analysis.overallScore >= 75
              ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {analysis.overallScore}%
        </span>
        <span className="text-slate-600 dark:text-slate-400">
          {analysis.covered.count + analysis.partial.count} /{" "}
          {analysis.covered.count +
            analysis.partial.count +
            analysis.missing.count}{" "}
          requirements
        </span>
      </div>

      {/* Score Detail Breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-slate-600 dark:text-slate-400">Content</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {analysis.contentScore}%
          </p>
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-400">Structure</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {analysis.structureScore}%
          </p>
        </div>
      </div>
    </div>
  );
};

interface CoverageBreakdownProps {
  analysis: FullAnalysisResult;
}

export const CoverageBreakdown: React.FC<CoverageBreakdownProps> = ({
  analysis,
}) => {
  return (
    <div className="grid gap-3 grid-cols-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {analysis.covered.count}
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-200 mt-1">
          Fully Covered
        </p>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {analysis.partial.count}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
          Partially Covered
        </p>
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
          {analysis.missing.count}
        </p>
        <p className="text-xs text-red-700 dark:text-red-200 mt-1">
          Missing
        </p>
      </div>
    </div>
  );
};

interface LowScoreWarningProps {
  shouldGenerate: boolean;
}

export const LowScoreWarning: React.FC<LowScoreWarningProps> = ({
  shouldGenerate,
}) => {
  if (!shouldGenerate) return null;

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-900 dark:text-amber-100">
        <span className="font-medium">Score too low for enhancement.</span>{" "}
        Consider generating documentation from scratch for better results.
      </AlertDescription>
    </Alert>
  );
};

interface RisksProps {
  risks: FullAnalysisResult["risks"];
}

export const RisksSection: React.FC<RisksProps> = ({ risks }) => {
  if (!risks || risks.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
      <p className="font-medium text-sm mb-3">Identified Risks ({risks.length})</p>
      <div className="space-y-2">
        {risks.slice(0, 3).map((risk: any, index: number) => {
          const severityConfig = {
            high: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-900 dark:text-red-200", border: "border-red-300 dark:border-red-800" },
            medium: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-900 dark:text-amber-200", border: "border-amber-300 dark:border-amber-800" },
            low: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-900 dark:text-blue-200", border: "border-blue-300 dark:border-blue-800" },
          };
          const config = severityConfig[risk.severity as keyof typeof severityConfig];

          return (
            <div
              key={index}
              className={`rounded-lg border ${config.border} ${config.bg} p-3`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${config.text}`}>!</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${config.text}`}>
                    {risk.description}
                  </p>
                  <p className={`mt-1 text-xs leading-snug ${config.text} opacity-75`}>
                    {risk.recommendation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {risks.length > 3 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 italic">
            +{risks.length - 3} more risks found (view all in document)
          </p>
        )}
      </div>
    </div>
  );
};
