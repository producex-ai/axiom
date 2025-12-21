"use client";

import React from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Evidence } from "./types";
import { formatFileSize } from "./fileUtils";

interface UploadZoneProps {
  selectedFiles: File[];
  uploadedEvidence: Evidence[];
  uploadProgress: number;
  errorMessage: string;
  isLoadingEvidence: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileClick: () => void;
  onRemoveFile: (index: number) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  selectedFiles,
  uploadedEvidence,
  uploadProgress,
  errorMessage,
  isLoadingEvidence,
  onFileSelect,
  onFileClick,
  onRemoveFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFileSelect}
        className="hidden"
      />

      {/* Loading Evidence */}
      {isLoadingEvidence && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 flex items-center justify-center gap-3 dark:border-slate-700 dark:bg-slate-900/30">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading existing evidence...
          </p>
        </div>
      )}

      {/* Upload Zone */}
      {!isLoadingEvidence && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/20 dark:hover:bg-slate-900/40"
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-medium text-sm">
            Drag and drop files here or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Max 3 files, 10MB each (DOCX only)
          </p>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-sm">
            Selected Files ({selectedFiles.length}/3)
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(index)}
                className="shrink-0"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Uploading...</p>
            <p className="text-sm text-slate-500">{Math.round(uploadProgress)}%</p>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded Evidence Summary */}
      {uploadedEvidence.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="mb-2 font-medium text-sm text-emerald-900 dark:text-emerald-100">
            ✅ {uploadedEvidence.length} file(s) uploaded successfully
          </p>
          <div className="space-y-1">
            {uploadedEvidence.map((file) => (
              <p
                key={file.id}
                className="text-xs text-emerald-800 dark:text-emerald-200"
              >
                • {file.fileName}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
