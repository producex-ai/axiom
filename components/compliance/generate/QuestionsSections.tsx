"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { QuestionInput } from "./QuestionInput";
import { type QuestionItem } from "@/lib/compliance/document-generation";

interface QuestionsListProps {
  questions: QuestionItem[];
  answers: Record<string, string | boolean>;
  onAnswerChange: (questionId: string, value: string | boolean) => void;
}

interface CoreQuestionsProps {
  questions: QuestionItem[];
  answers: Record<string, string | boolean>;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onAnswerChange: (questionId: string, value: string | boolean) => void;
}

export function CoreQuestions({
  questions,
  answers,
  isExpanded,
  onToggleExpanded,
  onAnswerChange,
}: CoreQuestionsProps) {
  const answeredCount = questions.filter((q: QuestionItem) => {
    const answer = answers[q.id];
    if (typeof answer === "boolean") return true;
    return answer && String(answer).trim().length > 0;
  }).length;

  return (
    <div className="space-y-3">
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Document Information
          </h3>
          <Badge variant="outline" className="text-xs">
            {answeredCount}/{questions.length}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 pl-6">
          {questions.map((question: QuestionItem) => {
            const isAnswered: boolean =
              typeof answers[question.id] === "boolean" ||
              !!(
                answers[question.id] &&
                String(answers[question.id]).trim().length > 0
              );
            return (
              <div key={question.id} className="space-y-2">
                <Label
                  htmlFor={question.id}
                  className="font-medium text-sm"
                >
                  {question.question}
                  <span className="ml-1 text-red-500">*</span>
                </Label>
                <QuestionInput
                  question={question}
                  value={answers[question.id] ?? ""}
                  isAnswered={isAnswered}
                  onChange={(value) => onAnswerChange(question.id, value)}
                />
                {question.hint && (
                  <p className="text-slate-500 text-xs">
                    {question.hint}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RequirementQuestionsProps {
  questions: QuestionItem[];
  answers: Record<string, string | boolean>;
  onAnswerChange: (questionId: string, value: string | boolean) => void;
}

export function RequirementQuestions({
  questions,
  answers,
  onAnswerChange,
}: RequirementQuestionsProps) {
  const answeredCount = questions.filter((q: QuestionItem) => {
    const answer = answers[q.id];
    if (typeof answer === "boolean") return true;
    return answer && String(answer).trim().length > 0;
  }).length;

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Compliance Requirements
            </h3>
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
            >
              {answeredCount}/{questions.length}
            </Badge>
          </div>
        </div>
        <div className="space-y-4 pl-6">
          {questions.map((question: QuestionItem, idx: number) => {
            const isAnswered: boolean =
              typeof answers[question.id] === "boolean" ||
              !!(
                answers[question.id] &&
                String(answers[question.id]).trim().length > 0
              );
            return (
              <div
                key={question.id}
                className={`space-y-2 rounded-lg border p-4 transition-colors ${
                  isAnswered
                    ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-semibold text-xs ${
                      isAnswered
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                    }`}
                  >
                    {isAnswered ? "✓" : idx + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor={question.id}
                      className="font-medium text-sm"
                    >
                      {question.question}
                      <span className="ml-1 text-red-500">*</span>
                    </Label>
                    <QuestionInput
                      question={question}
                      value={answers[question.id] ?? ""}
                      isAnswered={isAnswered}
                      onChange={(value) => onAnswerChange(question.id, value)}
                    />
                    {question.hint && (
                      <p className="flex items-start gap-1 text-slate-500 text-xs">
                        <span className="font-medium text-violet-600">
                          →
                        </span>
                        {question.hint}
                      </p>
                    )}
                    {question.checklistRefs &&
                      question.checklistRefs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {question.checklistRefs.map((ref: string) => (
                            <Badge
                              key={ref}
                              variant="outline"
                              className="border-violet-200 bg-white text-violet-700 text-xs dark:border-violet-800 dark:bg-slate-900 dark:text-violet-400"
                            >
                              {ref}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
