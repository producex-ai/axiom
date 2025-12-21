"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight } from "lucide-react";

interface QuestionsFormActionsProps {
  onCancel: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isFormValid: boolean;
  remainingQuestions: number;
}

export function QuestionsFormActions({
  onCancel,
  onGenerate,
  isGenerating,
  isFormValid,
  remainingQuestions,
}: QuestionsFormActionsProps) {
  return (
    <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t bg-white bg-opacity-95 pt-6 pb-6 backdrop-blur-sm dark:bg-slate-950">
      <Button onClick={onCancel} variant="outline" size="lg">
        Cancel
      </Button>
      <div className="flex flex-col items-end gap-2">
        {!isFormValid && remainingQuestions > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {remainingQuestions} question{remainingQuestions !== 1 ? "s" : ""} remaining
          </p>
        )}
        <Button
          onClick={onGenerate}
          disabled={!isFormValid || isGenerating}
          size="lg"
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Document
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
