"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { complianceKeys } from "@/lib/compliance/queries";

interface UploadDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  moduleNumber: string;
  subModuleCode: string;
  subModuleName: string;
  onSuccess?: () => void;
}

type UploadStep = "select" | "uploading" | "success" | "error";

export default function UploadDocumentDialog({
  open,
  onClose,
  moduleNumber,
  subModuleCode,
  subModuleName,
  onSuccess,
}: UploadDocumentDialogProps) {
  const [currentStep, setCurrentStep] = useState<UploadStep>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successFileName, setSuccessFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setCurrentStep("select");
      setSelectedFile(null);
      setUploadProgress(0);
      setErrorMessage("");
      setSuccessFileName("");
    }
  }, [open]);

  const handleClose = () => {
    if (currentStep === "success" && onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const validMimeType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (file.type !== validMimeType) {
      return "Only DOCX files are allowed";
    }

    // Check file extension
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return "File must have .docx extension";
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return "File size must be less than 10MB";
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setCurrentStep("error");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage("");
    setCurrentStep("select");
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setCurrentStep("uploading");
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("moduleNumber", moduleNumber);
      formData.append("subModuleCode", subModuleCode);

      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 30;
        });
      }, 300);

      const response = await fetch("/api/compliance/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Upload failed");
      }

      setUploadProgress(100);
      setSuccessFileName(data.fileName);
      setCurrentStep("success");

      // Invalidate and refetch overview data
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.overview(),
      });
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload document",
      );
      setCurrentStep("error");
    }
  };

  const handleRetry = () => {
    setCurrentStep("select");
    setErrorMessage("");
    setUploadProgress(0);
  };

  // Step 1: File Selection
  if (currentStep === "select") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a DOCX file for {subModuleName}
            </DialogDescription>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-4">
            {selectedFile ? (
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-medium text-sm">
                      {selectedFile.name}
                    </h4>
                    <p className="text-muted-foreground text-xs">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={handleUploadClick}
                className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-border/80 hover:bg-accent/50"
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-sm">Click to select a file</p>
                <p className="text-muted-foreground text-xs">
                  DOCX files only, max 10MB
                </p>
              </div>
            )}

            <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30">
              <p className="font-medium text-xs text-slate-600 dark:text-slate-400">
                Requirements:
              </p>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li>✓ File format: DOCX only</li>
                <li>✓ Maximum size: 10MB</li>
                <li>✓ Will be saved as Draft</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpload}
                disabled={!selectedFile}
                className="flex-1"
              >
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: Uploading
  if (currentStep === "uploading") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Uploading Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/30">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {selectedFile?.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {selectedFile
                      ? (selectedFile.size / 1024 / 1024).toFixed(2)
                      : "0"}{" "}
                    MB
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Uploading...</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Processing your document...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 3: Success
  if (currentStep === "success") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Upload Successful</DialogTitle>
            <DialogDescription>Your document has been uploaded</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/20">
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">Document uploaded</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {successFileName}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/30">
              <p className="font-medium text-xs text-slate-600 dark:text-slate-400">
                Next steps:
              </p>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li>✓ Document saved as Draft</li>
                <li>✓ You can now edit or publish</li>
                <li>✓ Version tracking enabled</li>
              </ul>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 4: Error
  if (currentStep === "error") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Upload Failed</DialogTitle>
            <DialogDescription>Something went wrong</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
