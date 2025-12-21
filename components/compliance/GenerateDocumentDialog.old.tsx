"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import {
  type QuestionItem,
  useGenerateDocument,
  useGenerateQuestions,
} from "@/lib/compliance/document-generation";
import { ErrorState, LoadingState } from "./generate/StepStates";
import { GeneratingStep, CompleteStep } from "./generate/GenerationSteps";
import { ProgressBar } from "./generate/ProgressBar";
import { CoreQuestions, RequirementQuestions } from "./generate/QuestionsSections";
import { QuestionsFormActions } from "./generate/QuestionsFormActions";

interface GenerateDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  moduleNumber: string;
  moduleName: string;
  subModuleCode: string;
  subModuleName: string;
  onSuccess?: () => void;
}

type GenerationStep = "questions" | "generating" | "complete";

export default function GenerateDocumentDialog({
  open,
  onClose,
  moduleNumber,
  moduleName,
  subModuleCode,
  subModuleName,
  onSuccess,
}: GenerateDocumentDialogProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>("questions");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [generatedDocKey, setGeneratedDocKey] = useState<string>("");
  const [generatedFileName, setGeneratedFileName] = useState<string>("");
  const [isCoreExpanded, setIsCoreExpanded] = useState(true);

  // Fetch questions dynamically from specification
  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    error: questionsError,
  } = useGenerateQuestions(moduleNumber, subModuleCode, open);

  // Generate document mutation
  const generateMutation = useGenerateDocument();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep("questions");
      setAnswers({});
      setGeneratedDocKey("");
      setGeneratedFileName("");
    }
  }, [open]);

  // Handle modal close
  const handleClose = () => {
    // Call onSuccess when closing after successful generation
    if (currentStep === "complete" && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, value: string | boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Validate if all required questions are answered
  const isFormValid = () => {
    if (!questionsData?.questions) return false;

    return questionsData.questions.every((q: QuestionItem) => {
      const answer = answers[q.id];
      // For boolean questions, false is valid
      if (q.type === "boolean") return answer !== undefined;
      // For other types, check if not empty
      return answer && String(answer).trim().length > 0;
    });
  };

  // Handle document generation
  const handleGenerate = async () => {
    if (!isFormValid()) {
      toast.error("Please answer all questions before generating.");
      return;
    }

    setCurrentStep("generating");

    try {
      const result = await generateMutation.mutateAsync({
        moduleNumber,
        subModuleCode,
        answers,
      });

      setGeneratedDocKey(result.contentKey);
      setGeneratedFileName(result.fileName);
      setCurrentStep("complete");

      toast.success(`${subModuleName} document created successfully.`);
    } catch (error) {
      console.error("Document generation failed:", error);
      setCurrentStep("questions");
      toast.error(
        error instanceof Error
          ? error.message
          : "Generation failed. Please try again.",
      );
    }
  };

  // Handle document download
  const handleDownload = async () => {
    if (!generatedDocKey) return;

    try {
      // Create download URL for S3 file
      const downloadUrl = `/api/compliance/download?key=${encodeURIComponent(generatedDocKey)}`;

      // Create temporary link and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = generatedFileName || "compliance-document.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download document. Please try again.");
    }
  };

  // Render questions step
  const renderQuestionsStep = () => {
    if (isLoadingQuestions) {
      return <LoadingState />;
    }

    if (questionsError) {
      return (
        <ErrorState
          title="Failed to Load Questions"
          message={
            questionsError instanceof Error
              ? questionsError.message
              : "Please try again"
          }
          onClose={handleClose}
        />
      );
    }

    if (!questionsData?.questions || questionsData.questions.length === 0) {
      return (
        <ErrorState
          title="No Questions Available"
          message="This submodule doesn't have questions configured yet."
          onClose={handleClose}
        />
      );
    }

    const questions = questionsData.questions;
    const answeredCount = Object.keys(answers).filter((key) => {
      const answer = answers[key];
      if (typeof answer === "boolean") return true;
      return answer && String(answer).trim().length > 0;
    }).length;

    // Separate core questions from requirement questions
    const coreQuestions = questions.slice(
      0,
      questionsData.coreQuestionCount || 6,
    );
    const requirementQuestions = questions.slice(
      questionsData.coreQuestionCount || 6,
    );

    return (
      <div className="space-y-6 py-6">
        {/* Progress indicator */}
        <ProgressBar answered={answeredCount} total={questions.length} />

        {/* Questions form */}
        <div className="space-y-6">
          {/* Core document information section */}
          {coreQuestions.length > 0 && (
            <CoreQuestions
              questions={coreQuestions}
              answers={answers}
              isExpanded={isCoreExpanded}
              onToggleExpanded={() => setIsCoreExpanded(!isCoreExpanded)}
              onAnswerChange={handleAnswerChange}
            />
          )}

          {/* Compliance requirements section */}
          {requirementQuestions.length > 0 && (
            <RequirementQuestions
              questions={requirementQuestions}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />
          )}
        </div>

        {/* Action buttons - sticky at bottom */}
        <QuestionsFormActions
          onCancel={handleClose}
          onGenerate={handleGenerate}
          isGenerating={generateMutation.isPending}
          isFormValid={isFormValid()}
          remainingQuestions={questions.length - answeredCount}
        />
      </div>
    );
  };

  // Render questions step
  const renderQuestionsStep = () => {
    if (isLoadingQuestions) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-slate-600 text-sm">
            Loading compliance questions...
          </p>
        </div>
      );
    }

    if (questionsError) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <p className="font-medium text-slate-900">
              Failed to Load Questions
            </p>
            <p className="mt-1 text-slate-600 text-sm">
              {questionsError instanceof Error
                ? questionsError.message
                : "Please try again"}
            </p>
          </div>
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </div>
      );
    }

    if (!questionsData?.questions || questionsData.questions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <AlertCircle className="h-12 w-12 text-amber-500" />
          <div className="text-center">
            <p className="font-medium text-slate-900">No Questions Available</p>
            <p className="mt-1 text-slate-600 text-sm">
              This submodule doesn't have questions configured yet.
            </p>
          </div>
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        </div>
      );
    }

    const questions = questionsData.questions;
    const answeredCount = Object.keys(answers).filter((key) => {
      const answer = answers[key];
      if (typeof answer === "boolean") return true;
      return answer && String(answer).trim().length > 0;
    }).length;

    const progressPercent = Math.round(
      (answeredCount / questions.length) * 100,
    );

    // Separate core questions from requirement questions
    const coreQuestions = questions.slice(
      0,
      questionsData.coreQuestionCount || 6,
    );
    const requirementQuestions = questions.slice(
      questionsData.coreQuestionCount || 6,
    );

    // Count answered questions in each section
    const answeredCoreCount = coreQuestions.filter((q: QuestionItem) => {
      const answer = answers[q.id];
      if (typeof answer === "boolean") return true;
      return answer && String(answer).trim().length > 0;
    }).length;

    const answeredRequirementCount = requirementQuestions.filter(
      (q: QuestionItem) => {
        const answer = answers[q.id];
        if (typeof answer === "boolean") return true;
        return answer && String(answer).trim().length > 0;
      },
    ).length;

    return (
      <div className="space-y-6 py-6">
        {/* Progress indicator */}
        <div className="sticky top-0 z-10 rounded-lg border border-violet-200/50 bg-gradient-to-r bg-opacity-95 from-violet-50 to-fuchsia-50 p-4 backdrop-blur-sm dark:from-violet-950/30 dark:to-fuchsia-950/30">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-slate-700 text-sm dark:text-slate-300">
              Progress
            </span>
            <span className="font-semibold text-sm text-violet-700 dark:text-violet-400">
              {answeredCount} / {questions.length} answered
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
              {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>

        {/* Questions form */}
        <div className="space-y-6">
          {/* Core document information section */}
          {coreQuestions.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setIsCoreExpanded(!isCoreExpanded)}
                className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Document Information
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {answeredCoreCount}/{coreQuestions.length}
                  </Badge>
                </div>
                {isCoreExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {isCoreExpanded && (
                <div className="space-y-4 pl-6">
                  {coreQuestions.map((question: QuestionItem) => {
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
                        {renderQuestionInput(question, isAnswered)}
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
          )}

          {/* Compliance requirements section */}
          {requirementQuestions.length > 0 && (
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
                      {answeredRequirementCount}/{requirementQuestions.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4 pl-6">
                  {requirementQuestions.map(
                    (question: QuestionItem, idx: number) => {
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
                              {renderQuestionInput(question, isAnswered)}
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
                                    {question.checklistRefs.map(
                                      (ref: string) => (
                                        <Badge
                                          key={ref}
                                          variant="outline"
                                          className="border-violet-200 bg-white text-violet-700 text-xs dark:border-violet-800 dark:bg-slate-900 dark:text-violet-400"
                                        >
                                          {ref}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action buttons - sticky at bottom */}
        <div className="sticky bottom-0 mt-6 flex items-center justify-between border-t bg-white bg-opacity-95 pt-6 pb-6 backdrop-blur-sm dark:bg-slate-950">
          <Button onClick={handleClose} variant="outline" size="lg">
            Cancel
          </Button>
          <div className="flex flex-col items-end gap-2">
            {!isFormValid() && progressPercent > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? "s" : ""} remaining
              </p>
            )}
            <Button
              onClick={handleGenerate}
              disabled={!isFormValid()}
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Document
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render generating step
  const renderGeneratingStep = () => {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-16">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-30 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600">
            <Sparkles className="h-10 w-10 animate-pulse text-white" />
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
          <Button onClick={handleClose} variant="outline" size="lg">
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
  };

  // Render complete step
  const renderCompleteStep = () => {
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
          <Button onClick={handleClose} variant="outline" size="lg">
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
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col p-0">
        <div className="flex-shrink-0 border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Generate Compliance Document
            </DialogTitle>
            <DialogDescription>
              {currentStep === "questions" && (
                <>
                  Answer the following questions to generate a comprehensive
                  compliance document for <strong>{subModuleName}</strong>
                </>
              )}
              {currentStep === "generating" && (
                <>
                  Creating your compliance document with AI-powered content
                  generation
                </>
              )}
              {currentStep === "complete" && (
                <>Your document has been created and saved as a draft</>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {currentStep === "questions" && renderQuestionsStep()}
          {currentStep === "generating" && renderGeneratingStep()}
          {currentStep === "complete" && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
