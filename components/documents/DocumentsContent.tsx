"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { useAllDocuments } from "@/lib/compliance/queries";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { CompanyDocumentUploadDialog } from "@/components/documents/CompanyDocumentUploadDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DocumentsContent() {
  const { data, isLoading, error } = useAllDocuments();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load documents. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const documents = data?.documents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Company Documents
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage and view all compliance documents for your organization
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No documents found. Generate your first compliance document from the
            Primus GFS section.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""} found
          </div>
          <DocumentsTable documents={documents} />
        </div>
      )}

      <CompanyDocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </div>
  );
}
