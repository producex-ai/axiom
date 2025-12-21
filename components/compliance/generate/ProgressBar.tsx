"use client";

import React from "react";

interface ProgressBarProps {
  answered: number;
  total: number;
}

export function ProgressBar({ answered, total }: ProgressBarProps) {
  const progressPercent = Math.round((answered / total) * 100);
  const remaining = total - answered;

  return (
    <div className="sticky top-0 z-10 rounded-lg border border-violet-200/50 bg-gradient-to-r bg-opacity-95 from-violet-50 to-fuchsia-50 p-4 backdrop-blur-sm dark:from-violet-950/30 dark:to-fuchsia-950/30">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium text-slate-700 text-sm dark:text-slate-300">
          Progress
        </span>
        <span className="font-semibold text-sm text-violet-700 dark:text-violet-400">
          {answered} / {total} answered
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/50 dark:bg-slate-800/50">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {progressPercent < 100 && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          {remaining} question{remaining !== 1 ? "s" : ""} remaining
        </p>
      )}
    </div>
  );
}
