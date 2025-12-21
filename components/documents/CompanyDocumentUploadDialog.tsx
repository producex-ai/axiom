"use client";

import { Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { complianceKeys } from "@/lib/compliance/queries";

interface CompanyDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDocumentUploadDialog({
  open,
  onOpenChange,
}: CompanyDocumentUploadDialogProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (
      selectedFile.type !==
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      toast.error("Only DOCX files are allowed");
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error("Please provide a title and select a file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());

      toast.loading("Uploading document...", { id: "upload" });

      const response = await fetch("/api/compliance/company-documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload document");
      }

      toast.success("Document uploaded successfully", { id: "upload" });
      queryClient.invalidateQueries({
        queryKey: complianceKeys.allDocuments(),
      });

      // Reset form
      setTitle("");
      setFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload document",
        { id: "upload" },
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Company Document</DialogTitle>
          <DialogDescription>
            Upload a DOCX file as a company document. It will not be associated
            with any specific module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">Document Title</Label>
            <Input
              id="title"
              placeholder="e.g., Safety Policy 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Document File (DOCX)</Label>
            <div className="relative">
              <input
                id="file"
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor="file"
                className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-8 hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    DOCX files up to 10MB
                  </p>
                </div>
              </label>
            </div>

            {/* File Info */}
            {file && (
              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <div className="text-sm">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || !title.trim()}
            className="flex-1 gap-2"
          >
            {uploading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
