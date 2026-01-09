"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Edit, Eye, Globe, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { DocumentEditor } from "@/components/editor";
import { AuditDialog } from "@/components/editor/AuditDialog";
import { SimplePublishDialog } from "@/components/editor/SimplePublishDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { complianceKeys } from "@/lib/compliance/queries";
import {
  convertHtmlToMarkdown,
  convertMarkdownToHtml,
} from "@/lib/document-converters";
import { executePublishFlow } from "@/lib/editor/publish-flow";

interface EditParams {
  params: Promise<{ id: string }>;
}

export default function EditDocumentPage({ params }: EditParams) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [id, setId] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<any>(null);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [auditIssues, setAuditIssues] = useState<any[]>([]);
  const [simplePublishDialogOpen, setSimplePublishDialogOpen] = useState(false);
  const editorStabilizedRef = React.useRef(false);

  useEffect(() => {
    params.then(({ id }) => {
      setId(id);
      loadDocument(id);
    });
  }, [params]);

  useEffect(() => {
    if (content && originalContent && userHasEdited) {
      const currentMarkdown = convertHtmlToMarkdown(content)
        .trim()
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+$/gm, "");

      const originalMarkdownNormalized = originalContent
        .trim()
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+$/gm, "");

      setHasChanges(currentMarkdown !== originalMarkdownNormalized);
    }
  }, [content, originalContent, userHasEdited]);

  const loadDocument = async (docId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/compliance/documents/${docId}/content`,
      );

      if (!response.ok) {
        throw new Error("Failed to load document");
      }

      const data = await response.json();
      const markdown = data.content;
      const html = convertMarkdownToHtml(markdown);

      setContent(html);
      setOriginalContent(markdown);
      setDocumentMetadata(data.metadata);

      // Load existing analysis results if available
      if (data.metadata?.analysisScore) {
        console.log(
          "[EditDocument] Loaded existing analysis results:",
          data.metadata.analysisScore,
        );
        setAuditResults(data.metadata.analysisScore);
        setAuditIssues(data.metadata.analysisScore.risks || []);
      }

      setHasChanges(false);
      setUserHasEdited(false);
      editorStabilizedRef.current = false;

      setTimeout(() => {
        editorStabilizedRef.current = true;
      }, 500);
    } catch (err) {
      console.error("Error loading document:", err);
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (skipValidation: boolean = false) => {
    if (!id) return;

    try {
      setPublishing(true);
      setError(null);

      let markdown = convertHtmlToMarkdown(content);

      if (documentMetadata?.title) {
        const titlePatterns = [
          new RegExp(
            `^#{1,6}\\s*${documentMetadata.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
            "i",
          ),
          new RegExp(
            `^${documentMetadata.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
            "i",
          ),
        ];

        for (const pattern of titlePatterns) {
          markdown = markdown.replace(pattern, "");
        }
        markdown = markdown.trim();
      }

      // Check if this is a company document (non-compliance)
      const isCompanyDoc = documentMetadata?.docType === 'company';

      if (isCompanyDoc) {
        // NON-COMPLIANCE FLOW: Direct publish without analysis
        const response = await fetch(
          `/api/compliance/documents/${id}/content`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              content: markdown, 
              status: "published"
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to publish document");
        }

        const result = await response.json();

        // Update state
        setOriginalContent(markdown);
        setHasChanges(false);
        setUserHasEdited(false);
        setDocumentMetadata((prev: any) => ({
          ...prev,
          status: "published",
          version: result.version,
        }));

        // Invalidate cache
        await queryClient.invalidateQueries({
          queryKey: complianceKeys.allDocuments(),
        });
        await queryClient.invalidateQueries({
          queryKey: complianceKeys.overview(),
        });

        toast.success("Document published successfully");
        setTimeout(() => {
          router.push("/documents");
        }, 500);
      } else {
        // COMPLIANCE FLOW: Use the built-in publish flow with audit validation
        const result = await executePublishFlow(
          id,
          markdown,
          documentMetadata?.title || "Document",
          { skipValidation },
        );

        // Always show the audit dialog with results
        setAuditResults(result.fullAnalysis);
        setAuditIssues(result.highRiskIssues || []);
        setAuditDialogOpen(true);

        // If successful, prepare for navigation after dialog is closed
        if (result.success) {
          await queryClient.invalidateQueries({
            queryKey: complianceKeys.allDocuments(),
          });
          await queryClient.invalidateQueries({
            queryKey: complianceKeys.overview(),
          });

          setOriginalContent(markdown);
          setHasChanges(false);
          setUserHasEdited(false);
          setDocumentMetadata((prev: any) => ({
            ...prev,
            status: "published",
            version: result.version,
          }));
        }
      }

      setPublishing(false);
    } catch (err) {
      console.error("Error publishing document:", err);
      const message =
        err instanceof Error ? err.message : "Failed to publish document";
      setError(message);
      toast.error(message);
      setPublishing(false);
    }
  };

  const handleAuditDialogClose = () => {
    setAuditDialogOpen(false);
    // If document was successfully published, navigate away
    if (documentMetadata?.status === "published") {
      toast.success("Document published successfully");
      setTimeout(() => {
        router.push("/documents");
      }, 500);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.push("/documents");
  };

  const toggleMode = () => {
    if (mode === "view") {
      setMode("edit");
    } else {
      if (hasChanges) {
        const confirmed = confirm(
          "You have unsaved changes. Switching to view mode will discard them. Continue?",
        );
        if (!confirmed) return;
      }
      setMode("view");
      const html = convertMarkdownToHtml(originalContent);
      setContent(html);
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md space-y-4 text-center">
          <div className="font-semibold text-destructive text-lg">Error</div>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={publishing}
              >
                ← Back
              </Button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate font-semibold text-xl">
                  {documentMetadata?.title || "Document"}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={mode === "edit" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {mode === "view" ? (
                      <>
                        <Eye className="mr-1 h-3 w-3" />
                        View Mode
                      </>
                    ) : (
                      <>
                        <Edit className="mr-1 h-3 w-3" />
                        Edit Mode
                      </>
                    )}
                  </Badge>
                  {documentMetadata?.version && (
                    <span className="text-muted-foreground text-xs">
                      v{documentMetadata.version}
                    </span>
                  )}
                  {hasChanges && (
                    <span className="text-amber-600 text-xs dark:text-amber-400">
                      • Unsaved changes
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMode}
                disabled={loading || publishing}
              >
                {mode === "view" ? (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </>
                )}
              </Button>

              {mode === "edit" && (
                <>
                  {/* Review Issues button - only for compliance documents */}
                  {documentMetadata?.docType !== 'company' && auditResults && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditDialogOpen(true)}
                    >
                      {auditIssues.length > 0 ? (
                        <>
                          <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                          Review Issues ({auditIssues.length})
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mr-2 h-4 w-4 text-green-600" />
                          Review Analysis
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      // For company docs, show simple confirmation dialog
                      // For compliance docs, run full publish flow
                      if (documentMetadata?.docType === 'company') {
                        setSimplePublishDialogOpen(true);
                      } else {
                        handlePublish();
                      }
                    }}
                    disabled={!hasChanges || publishing || loading}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Publish
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full px-4 py-6">
          <DocumentEditor
            documentId={id || ""}
            documentTitle={documentMetadata?.title || "Document"}
            initialContent={content}
            readOnly={mode === "view"}
            onChange={(newContent) => {
              setContent(newContent);
              if (editorStabilizedRef.current) {
                setUserHasEdited(true);
              }
            }}
            showToolbar={mode === "edit"}
            showAI={mode === "edit"}
            placeholder="Start editing your document..."
          />
        </div>
      </main>

      {/* Audit Dialog - for compliance documents */}
      {documentMetadata?.docType !== 'company' && (
        <AuditDialog
          open={auditDialogOpen}
          onClose={handleAuditDialogClose}
          issues={auditIssues}
          onFixClick={handleAuditDialogClose}
          onPublishClick={() => {
            setAuditDialogOpen(false);
            handlePublish(true);
          }}
          version={documentMetadata?.version || 1}
          fullAnalysis={auditResults}
        />
      )}

      {/* Simple Publish Dialog - for company documents */}
      {documentMetadata?.docType === 'company' && (
        <SimplePublishDialog
          open={simplePublishDialogOpen}
          onClose={() => setSimplePublishDialogOpen(false)}
          onConfirm={() => {
            setSimplePublishDialogOpen(false);
            handlePublish();
          }}
          isPublishing={publishing}
        />
      )}
    </div>
  );
}
