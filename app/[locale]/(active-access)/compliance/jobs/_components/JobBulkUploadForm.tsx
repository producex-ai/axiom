"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadAndExtractJobsAction } from "@/actions/jobs/job-bulk-actions";
import type { JobTemplateWithFields } from "@/lib/services/jobTemplateService";
import type { OrgMember } from "@/actions/auth/clerk";

interface JobBulkUploadFormProps {
  templates: JobTemplateWithFields[];
  members: OrgMember[];
}

export function JobBulkUploadForm({ templates, members }: JobBulkUploadFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/csv",
      "image/png",
      "image/jpeg",
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Excel, Word, CSV, or image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleExtract = async () => {
    if (!selectedFile || !selectedTemplateId) {
      toast({
        title: "Missing information",
        description: "Please select both a template and a file.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("templateId", selectedTemplateId);

      const result = await uploadAndExtractJobsAction(formData);

      if (!result.success) {
        toast({
          title: "Extraction failed",
          description: result.error || "Failed to extract jobs from document.",
          variant: "destructive",
        });
        return;
      }

      // Store extraction result in sessionStorage and navigate to review page
      sessionStorage.setItem("jobExtractionResult", JSON.stringify(result.data));
      router.push("/compliance/jobs/bulk-create/review");
    } catch (error) {
      console.error("Error extracting jobs:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <File className="h-8 w-8" />;

    const type = selectedFile.type;
    if (type.includes("spreadsheet") || type.includes("excel")) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }
    if (type.includes("pdf") || type.includes("word") || type.includes("document")) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    }
    return <File className="h-8 w-8" />;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Template */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Job Template</CardTitle>
          <CardDescription>
            Choose the template that matches your document structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Job Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {template.category}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Template Fields:</h4>
                <div className="space-y-1">
                  {selectedTemplate.fields
                    .filter((f) => f.field_category === "creation")
                    .map((field) => (
                      <div key={field.id} className="text-sm flex items-center gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{field.field_label}</span>
                        {field.is_required && (
                          <span className="text-xs text-red-500">*required</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload Document */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload Document</CardTitle>
          <CardDescription>
            Upload a document containing job data (Excel, PDF, Word, or image)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getFileIcon()}
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Drag and drop your file here, or
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("file-upload")?.click()}
                    >
                      Browse Files
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported: PDF, Excel, Word, CSV, PNG, JPG (max 10MB)
                  </p>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleExtract}
              disabled={!selectedFile || !selectedTemplateId || isExtracting}
            >
              {isExtracting ? (
                <>
                  <span className="mr-2">Extracting Jobs...</span>
                  <span className="animate-pulse">●●●</span>
                </>
              ) : (
                "Extract Jobs from Document"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">💡 Tips for Best Results</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Ensure your document has a clear table with headers</li>
            <li>Column names should match template fields when possible</li>
            <li>Remove unnecessary headers, footers, and logos</li>
            <li>For Excel files, place data in the first sheet</li>
            <li>You'll be able to review and edit all extracted data before creating jobs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
