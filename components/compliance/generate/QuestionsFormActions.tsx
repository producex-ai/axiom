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
    <div className="sticky bottom-0 -mx-6 mt-4 flex items-center justify-end gap-4 border-t bg-white bg-opacity-95 px-6 py-4 backdrop-blur-sm dark:bg-slate-950">
      <Button onClick={onCancel} variant="outline" size="lg">
        Cancel
      </Button>
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
  );
}
