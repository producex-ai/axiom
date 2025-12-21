"use client";

import { CheckCircle2, Loader2, Download } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeneratingStepProps {
  subModuleName: string;
  moduleNumber: string;
  subModuleCode: string;
  onClose: () => void;
}

export function GeneratingStep({
  subModuleName,
  moduleNumber,
  subModuleCode,
  onClose,
}: GeneratingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-16">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-30 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600">
          <CheckCircle2 className="h-10 w-10 animate-pulse text-white" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h3 className="font-semibold text-slate-900 text-xl dark:text-slate-100">
          Generating Your Document
        </h3>
        <p className="max-w-md text-slate-600 text-sm dark:text-slate-400">
          AI is analyzing compliance requirements and creating a comprehensive
          document tailored to your organization...
        </p>
      </div>

      {/* Animated progress steps */}
      <div className="w-full max-w-md space-y-3">
        {[
          { label: "Analyzing requirements", delay: 0 },
          { label: "Building document structure", delay: 1000 },
          { label: "Generating content", delay: 2000 },
          { label: "Finalizing document", delay: 3000 },
        ].map((step, idx) => (
          <div
            key={idx}
            className="flex animate-fade-in items-center gap-3 text-sm"
            style={{ animationDelay: `${step.delay}ms` }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
            </div>
            <span className="text-slate-600 dark:text-slate-400">
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Document info card */}
      <div className="w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-violet-600" />
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {subModuleName}
            </p>
            <p className="text-slate-500 text-xs">
              Module {moduleNumber} • {subModuleCode}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" size="lg">
          Close
        </Button>
      </div>
    </div>
  );
}

interface CompleteStepProps {
  subModuleName: string;
  moduleNumber: string;
  subModuleCode: string;
  generatedFileName: string;
  generatedDocKey: string;
  onClose: () => void;
  onDownload: () => Promise<void>;
}

export function CompleteStep({
  subModuleName,
  moduleNumber,
  subModuleCode,
  generatedFileName,
  generatedDocKey,
  onClose,
  onDownload,
}: CompleteStepProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-16">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 opacity-30 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <h3 className="font-semibold text-slate-900 text-xl dark:text-slate-100">
          Document Generated Successfully!
        </h3>
        <p className="max-w-md text-slate-600 text-sm dark:text-slate-400">
          Your compliance document has been created and saved as a draft. You
          can review and publish it when ready.
        </p>
      </div>

      {/* Document info card */}
      <div className="w-full max-w-md space-y-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-violet-600" />
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {subModuleName}
            </p>
            <p className="text-slate-500 text-xs">
              Module {moduleNumber} • {subModuleCode}
            </p>
          </div>
        </div>
        {generatedFileName && (
          <div className="space-y-1 border-slate-200 border-t pt-3 dark:border-slate-700">
            <p className="font-medium text-slate-700 text-xs dark:text-slate-300">
              File: {generatedFileName}
            </p>
            <p className="break-all font-mono text-slate-500 text-xs">
              {generatedDocKey}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" size="lg">
          Close
        </Button>
        <Button
          onClick={handleDownload}
          disabled={isDownloading || !generatedDocKey}
          size="lg"
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Document
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
