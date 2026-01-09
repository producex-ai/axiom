"use client";

import { Upload, X, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { complianceKeys, useComplianceOverview } from "@/lib/compliance/queries";

interface CompanyDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyDocumentUploadDialog({
  open,
  onOpenChange,
}: CompanyDocumentUploadDialogProps) {
  const queryClient = useQueryClient();
  const { data: overview, isLoading: loadingOverview } = useComplianceOverview();
  
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [selectedSubModule, setSelectedSubModule] = useState<string>("");
  const [renewalPeriod, setRenewalPeriod] = useState<string>("");

  // Get available modules
  const availableModules = useMemo(() => {
    if (!overview?.modules) return [];
    return overview.modules.filter((m) => m.enabled);
  }, [overview]);

  // Get available sub-modules based on selected module
  const availableSubModules = useMemo(() => {
    if (!selectedModule || !availableModules.length) return [];
    const module = availableModules.find((m) => m.module === selectedModule);
    return module?.submodules || [];
  }, [selectedModule, availableModules]);

  // Reset sub-module when module changes
  const handleModuleChange = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedSubModule("");
  };

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
    if (!file || !title.trim() || !selectedModule || !selectedSubModule) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("moduleId", selectedModule);
      formData.append("subModuleId", selectedSubModule);
      if (renewalPeriod) {
        formData.append("renewal", renewalPeriod);
      }
      formData.append("docType", "company");

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
      queryClient.invalidateQueries({
        queryKey: complianceKeys.overview(),
      });

      // Reset form
      setTitle("");
      setFile(null);
      setSelectedModule("");
      setSelectedSubModule("");
      setRenewalPeriod("");
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a DOCX file and assign it to a specific module and sub-module for compliance tracking.
          </DialogDescription>
        </DialogHeader>

        {loadingOverview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading modules...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Document Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Safety Policy 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
              />
            </div>

            {/* Module Selection */}
            <div className="space-y-2">
              <Label htmlFor="module">
                Module <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedModule}
                onValueChange={handleModuleChange}
                disabled={uploading || !availableModules.length}
              >
                <SelectTrigger id="module">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map((module) => (
                    <SelectItem key={module.module} value={module.module}>
                      Module {module.module} - {module.moduleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-Module Selection */}
            <div className="space-y-2">
              <Label htmlFor="submodule">
                Sub-Module <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedSubModule}
                onValueChange={setSelectedSubModule}
                disabled={uploading || !selectedModule || !availableSubModules.length}
              >
                <SelectTrigger id="submodule">
                  <SelectValue
                    placeholder={selectedModule ? "Select a sub-module" : "Select module first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSubModules.map((subModule) => (
                    <SelectItem key={subModule.code} value={subModule.code}>
                      {subModule.code} - {subModule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Renewal Period Selection */}
            <div className="space-y-2">
              <Label htmlFor="renewal">Renewal Period (Optional)</Label>
              <Select
                value={renewalPeriod}
                onValueChange={setRenewalPeriod}
                disabled={uploading}
              >
                <SelectTrigger id="renewal">
                  <SelectValue placeholder="Select renewal period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annually">Semi Annually</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="2_years">2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">
                Document File (DOCX) <span className="text-destructive">*</span>
              </Label>
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
        )}

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
            disabled={
              uploading ||
              !file ||
              !title.trim() ||
              !selectedModule ||
              !selectedSubModule ||
              loadingOverview
            }
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
