"use client";

import { ArrowLeft, Edit, Eye, Globe, Loader2, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentEditor } from "@/components/editor";
import { AuditDialog } from "@/components/editor/AuditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { convertHtmlToMarkdown, convertMarkdownToHtml } from "@/lib/document-converters";
import { complianceKeys } from "@/lib/compliance/queries";
import { executePublishFlow } from "@/lib/editor/publish-flow";

interface DocumentEditorClientProps {
  documentId: string;
  initialMode: "view" | "edit";
}

export default function DocumentEditorClient({ documentId, initialMode }: DocumentEditorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const backTo = searchParams.get("backTo");
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<any>(null);
  const [auditIssuesOpen, setAuditIssuesOpen] = useState(false);
  const [auditIssues, setAuditIssues] = useState<any[]>([]);
  const [auditAnalysis, setAuditAnalysis] = useState<any>(null);
  const [lastPublishedVersion, setLastPublishedVersion] = useState<number>(0);
  const editorStabilizedRef = React.useRef(false);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  useEffect(() => {
    if (content && originalContent && userHasEdited) {
      // Normalize both sides for comparison
      const currentMarkdown = convertHtmlToMarkdown(content)
        .trim()
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
        .replace(/\s+$/gm, ''); // Remove trailing whitespace from lines
      
      const originalMarkdownNormalized = originalContent
        .trim()
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/gm, '');
      
      setHasChanges(currentMarkdown !== originalMarkdownNormalized);
    }
  }, [content, originalContent, userHasEdited]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/compliance/documents/${documentId}/content`);

      if (!response.ok) {
        throw new Error("Failed to load document");
      }

      const data = await response.json();
      const markdown = data.content;
      const html = convertMarkdownToHtml(markdown);

      setContent(html);
      setOriginalContent(markdown);
      setDocumentMetadata(data.metadata);
      setHasChanges(false);
      setUserHasEdited(false);
      editorStabilizedRef.current = false;
      
      // Allow editor to stabilize before tracking changes
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
    try {
      setPublishing(true);
      setError(null);

      let markdown = convertHtmlToMarkdown(content);
      
      // Strip document title if it appears at the beginning (safety check)
      if (documentMetadata?.title) {
        const titlePatterns = [
          new RegExp(`^#{1,6}\\s*${documentMetadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`, 'i'),
          new RegExp(`^${documentMetadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`, 'i'),
        ];
        
        for (const pattern of titlePatterns) {
          markdown = markdown.replace(pattern, '');
        }
        markdown = markdown.trim();
      }

      // Show loading toast while executing publish flow
      const loadingToastId = toast.loading(skipValidation ? "Publishing document..." : "Saving and validating document...");

      try {
        // Execute the complete publish flow:
        // 1. Persist changes (always)
        // 2. Validate audit readiness (unless skipValidation is true)
        // 3. Conditionally finalize publish
        const result = await executePublishFlow(
          documentId,
          markdown,
          documentMetadata?.title || "Document",
          { skipValidation }
        );

        // Dismiss loading toast
        toast.dismiss(loadingToastId);

        // Update local state after successful persistence
        setOriginalContent(markdown);
        setHasChanges(false);
        setUserHasEdited(false);
        setLastPublishedVersion(result.version || 0);

        if (result.success) {
          // ✅ Publish succeeded - transition to published state
          setMode("view");
          setDocumentMetadata((prev: any) => ({
            ...prev,
            status: result.status,
            version: result.version,
          }));

          // Invalidate cache
          await queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });

          // Show success confirmation
          toast.success(result.message, {
            description: `Document v${result.version} published`,
          });

          // Navigate back to module details after brief delay
          setTimeout(() => {
            if (backTo) {
              router.push(backTo);
            } else {
              router.back();
            }
          }, 1000);
        } else {
          // ⚠️ Publish blocked - show audit issues
          // Document is saved, but state remains draft
          setDocumentMetadata((prev: any) => ({
            ...prev,
            version: result.version,
          }));

          // Show audit issues dialog with full analysis
          setAuditIssues(result.fullAnalysis?.risks || []);
          setAuditAnalysis(result.fullAnalysis || null);
          setAuditIssuesOpen(true);

          // Show warning toast
          toast.error(result.message, {
            description: `Document v${result.version} saved but blocked from publishing`,
          });
        }
      } catch (publishError) {
        toast.dismiss(loadingToastId);
        throw publishError;
      }

      // Invalidate cache in background
      await queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });
    } catch (err) {
      console.error("Error in publish flow:", err);
      const message = err instanceof Error ? err.message : "Failed to publish document";
      setError(message);
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }
    
    if (backTo) {
      router.push(backTo);
    } else {
      router.back();
    }
  };

  const toggleMode = () => {
    if (mode === "view") {
      setMode("edit");
      router.replace(`/dashboard/compliance/documents/${documentId}/edit?mode=edit`, { scroll: false });
    } else {
      if (hasChanges) {
        const confirmed = confirm(
          "You have unsaved changes. Switching to view mode will discard them. Continue?"
        );
        if (!confirmed) return;
      }
      setMode("view");
      const html = convertMarkdownToHtml(originalContent);
      setContent(html);
      setHasChanges(false);
      router.replace(`/dashboard/compliance/documents/${documentId}/edit?mode=view`, { scroll: false });
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
          <Button onClick={() => router.back()}>Go Back</Button>
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-semibold text-xl">
                  {documentMetadata?.title || "Document"}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={mode === "edit" ? "default" : "outline"} className="text-xs">
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
                  {auditIssues.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditIssuesOpen(true)}
                    >
                      <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                      Review Issues ({auditIssues.length})
                    </Button>
                  )}
                  {auditAnalysis && auditAnalysis.auditReadinessScore >= 90 && auditIssues.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAuditIssuesOpen(true)}
                    >
                      <AlertCircle className="mr-2 h-4 w-4 text-green-600" />
                      Review Results
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handlePublish()}
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

      {/* Audit Issues Dialog - Shown when publish is blocked by audit issues */}
      <AuditDialog
        open={auditIssuesOpen}
        onClose={() => setAuditIssuesOpen(false)}
        issues={auditIssues}
        onFixClick={() => setAuditIssuesOpen(false)}
        onPublishClick={() => handlePublish(true)}
        version={lastPublishedVersion}
        fullAnalysis={auditAnalysis}
      />

      {/* Editor */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full px-4 py-6">
          <DocumentEditor
            documentId={documentId}
            documentTitle={documentMetadata?.title || "Document"}
            initialContent={content}
            readOnly={mode === "view"}
            onChange={(newContent) => {
              setContent(newContent);
              // Only mark as edited if editor has stabilized
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
    </div>
  );
}
