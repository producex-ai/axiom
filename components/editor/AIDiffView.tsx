"use client";

import { CheckCircle2, Loader2, Sparkles, X, XCircle } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIDiffViewProps {
  original: string;
  suggestion: string;
  isLoading?: boolean;
  onAccept: () => void;
  onReject: () => void;
  className?: string;
}

export function AIDiffView({
  original,
  suggestion,
  isLoading,
  onAccept,
  onReject,
  className,
}: AIDiffViewProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border-2 border-primary/20 bg-background shadow-2xl p-4 my-4",
        "animate-in fade-in-0 slide-in-from-bottom-2",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">
            {isLoading ? "Generating with AI..." : "AI Suggestion"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Please wait" : "Review and apply changes"}
          </p>
        </div>
        {!isLoading && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onReject}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Diff Content */}
      {!isLoading && (
        <div className="space-y-3">
          {/* Original Text (being removed) */}
          {original && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-red-100 dark:bg-red-900/30">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                    -
                  </span>
                </div>
                <span className="text-xs font-medium text-red-700 dark:text-red-400">
                  Original
                </span>
              </div>
              <div className="text-sm text-red-900 dark:text-red-100 line-through opacity-75">
                {original}
              </div>
            </div>
          )}

          {/* Suggested Text (being added) */}
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-green-100 dark:bg-green-900/30">
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                  +
                </span>
              </div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                AI Suggestion
              </span>
            </div>
            <div className="text-sm text-green-900 dark:text-green-100">
              {suggestion}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              AI is analyzing your text...
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t">
          <Button
            onClick={onReject}
            variant="outline"
            size="sm"
            className="gap-2 flex-1"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={onAccept}
            size="sm"
            className="gap-2 flex-1 bg-primary"
          >
            <CheckCircle2 className="h-4 w-4" />
            Apply Changes
          </Button>
        </div>
      )}
    </div>
  );
}

interface AIProcessingIndicatorProps {
  message?: string;
  progress?: number;
}

export function AIProcessingIndicator({
  message = "Processing with AI...",
  progress,
}: AIProcessingIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1.5",
        "animate-in fade-in-0 slide-in-from-left-2",
      )}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
      <span className="text-xs font-medium text-primary">{message}</span>
      {typeof progress === "number" && (
        <div className="h-1 w-16 rounded-full bg-primary/20 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
