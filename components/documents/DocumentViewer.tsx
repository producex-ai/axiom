"use client";

import { AlertCircle, Download, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDocumentContent, useUserProfile } from "@/lib/compliance/queries";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface DocumentViewerProps {
  documentId: string;
  title: string;
  status: "draft" | "published" | "archived";
  contentKey: string;
  version: number;
  updatedBy?: string | null;
  updatedAt?: string;
}

export function DocumentViewer({
  documentId,
  title,
  status,
  contentKey,
  version,
  updatedBy,
  updatedAt,
}: DocumentViewerProps) {
  const router = useRouter();
  const {
    data: content,
    isLoading: contentLoading,
    error: contentError,
  } = useDocumentContent(documentId);
  const { data: updatedByUser } = useUserProfile(updatedBy);
  const [isDownloading, setIsDownloading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "draft":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "archived":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-gray-500/10 text-gray-700";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      toast.loading("Downloading document...", { id: "download" });

      const response = await fetch(
        `/api/compliance/download?key=${encodeURIComponent(contentKey)}`,
      );

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document downloaded successfully", { id: "download" });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document", { id: "download" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (contentLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (contentError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load document content. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Version {version}
            </p>
          </div>
          <Badge className={getStatusColor(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        {/* Metadata */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Last Updated
            </p>
            <p className="text-sm">{formatDate(updatedAt)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Updated By
            </p>
            <p className="text-sm">
              {updatedByUser
                ? `${updatedByUser.firstName} ${updatedByUser.lastName}`
                : "System"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() =>
              router.push(`/dashboard/documents/${documentId}/edit`)
            }
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit Document
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <div
          dangerouslySetInnerHTML={{
            __html: content?.content || "",
          }}
        />
      </div>
    </div>
  );
}
