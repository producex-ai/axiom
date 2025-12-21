"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ViewParams {
  params: Promise<{ id: string }>;
}

export default function ViewDocumentPage({ params }: ViewParams) {
  const [id, setId] = useState<string | null>(null);
  const [document, setDocument] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setId(id);
      fetchDocument(id);
    });
  }, [params]);

  const fetchDocument = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/compliance/documents/${docId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }

      const data = await response.json();
      setDocument(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error || "Document not found"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <DocumentViewer
        documentId={document.id}
        title={document.title}
        status={document.status}
        contentKey={document.content_key}
        version={document.current_version}
        updatedBy={document.updated_by}
        updatedAt={document.updated_at}
      />
    </div>
  );
}
