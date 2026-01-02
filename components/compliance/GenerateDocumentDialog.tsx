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
  onSuccess?: (documentId?: string) => void;
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
  const [generatedDocId, setGeneratedDocId] = useState<string>("");
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
      setGeneratedDocId("");
      setGeneratedFileName("");
    }
  }, [open]);

  // Handle modal close
  const handleClose = () => {
    // Call onSuccess when closing after successful generation
    if (currentStep === "complete" && onSuccess) {
      onSuccess(generatedDocId);
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
      setGeneratedDocId(result.documentId);
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
      <div className="space-y-4 py-4">
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

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="!max-w-4xl flex h-[85vh] flex-col p-0">
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
          {currentStep === "generating" && (
            <GeneratingStep
              subModuleName={subModuleName}
              moduleNumber={moduleNumber}
              subModuleCode={subModuleCode}
              onClose={handleClose}
            />
          )}
          {currentStep === "complete" && (
            <CompleteStep
              subModuleName={subModuleName}
              moduleNumber={moduleNumber}
              subModuleCode={subModuleCode}
              generatedFileName={generatedFileName}
              generatedDocKey={generatedDocKey}
              onClose={handleClose}
              onDownload={handleDownload}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
