"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileEdit,
  FileText,
  History,
  Loader2,
  MoreVertical,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";
import EvidenceUploadFlow from "@/components/compliance/EvidenceUploadFlow";
import GenerateDocumentDialog from "@/components/compliance/GenerateDocumentDialog";
import { RevisionHistoryDialog } from "@/components/compliance/RevisionHistoryDialog";
import UploadDocumentDialog from "@/components/compliance/UploadDocumentDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { complianceKeys, useUserProfile } from "@/lib/compliance/queries";

interface SubModule {
  code: string;
  name: string;
  alias?: string;
  specFile?: string;
  questionsCount?: number;
  totalPoints?: number;
  hasSubSubModules?: boolean;
  document?: {
    id: string;
    status: "draft" | "published" | "archived";
    title: string;
    contentKey: string;
    version: number;
    analysisScore?: {
      overallScore?: number;
      contentScore?: number;
      structureScore?: number;
      auditReadinessScore?: number;
    } | null;
    updatedAt?: string;
    updatedBy?: string | null;
  };
  subSubModules?: any[];
}

interface SubModuleCardProps {
  subModule: SubModule;
  moduleNumber: string;
  moduleName?: string;
  colors: {
    gradient: string;
    bg: string;
    text: string;
    ring: string;
  };
  isNested?: boolean;
  onDocumentGenerated?: () => void;
}

export default function SubModuleCard({
  subModule,
  moduleNumber,
  moduleName = "Module",
  colors,
  isNested = false,
  onDocumentGenerated,
}: SubModuleCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEvidenceFlow, setShowEvidenceFlow] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [revisionHistoryDocId, setRevisionHistoryDocId] = useState<
    string | null
  >(null);
  const [revisionHistoryDocTitle, setRevisionHistoryDocTitle] = useState<
    string | null
  >(null);

  // Fetch user profile if we have an updatedBy userId
  const { data: updatedByUser } = useUserProfile(subModule.document?.updatedBy);

  const getStatusConfig = () => {
    const hasDocument = !!subModule.document;

    if (!hasDocument) {
      return {
        icon: AlertCircle,
        label: "No Document",
        variant: "outline" as const,
        className:
          "bg-primary/5 text-primary border-primary/20 dark:bg-primary/10 dark:text-primary",
      };
    }

    const status = subModule.document?.status;

    switch (status) {
      case "published":
        return {
          icon: CheckCircle2,
          label: "Published",
          variant: "default" as const,
          className:
            "bg-primary/10 text-primary border-primary/20 dark:text-primary dark:border-primary/30",
        };
      case "draft":
        return {
          icon: Clock,
          label: "Draft",
          variant: "outline" as const,
          className:
            "bg-primary/10 text-primary border-primary/20 dark:text-primary",
        };
      case "archived":
        return {
          icon: AlertCircle,
          label: "Archived",
          variant: "outline" as const,
          className:
            "bg-primary/5 text-primary border-primary/20 dark:text-primary",
        };
      default:
        return {
          icon: AlertCircle,
          label: "Unknown",
          variant: "outline" as const,
          className: "bg-primary/5 text-primary border-primary/20",
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;
  const isPublished = subModule.document?.status === "published";

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDownload = async () => {
    if (!subModule.document) return;

    try {
      toast.loading("Downloading document...", { id: "download" });

      // Call download API with S3 key
      const response = await fetch(
        `/api/compliance/download?key=${encodeURIComponent(subModule.document.contentKey)}`,
      );

      if (!response.ok) throw new Error("Download failed");

      // Trigger browser download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${subModule.code}_${subModule.name.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document downloaded successfully", { id: "download" });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document", { id: "download" });
    }
  };

  const handleDelete = async () => {
    if (!subModule.document) return;

    try {
      toast.loading("Deleting document...", { id: "delete" });

      const response = await fetch(
        `/api/compliance/documents/${subModule.document.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) throw new Error("Delete failed");

      toast.success("Document deleted successfully", { id: "delete" });

      // Invalidate and refetch overview data
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.overview(),
      });

      // Refresh parent component
      if (onDocumentGenerated) {
        onDocumentGenerated();
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document", { id: "delete" });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleUpload = () => {
    setShowEvidenceFlow(true);
  };

  const handleUploadSuccess = (documentId?: string) => {
    setShowEvidenceFlow(false);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });

    if (onDocumentGenerated) {
      onDocumentGenerated();
    }

    // Redirect to edit page if we have a document ID
    if (documentId) {
      setIsNavigating(true);
      router.push(
        `/compliance/documents/${documentId}/edit?mode=edit&backTo=${encodeURIComponent(`/compliance?module=${moduleNumber}`)}`,
      );
    }
  };

  const handleCreate = () => {
    setShowGenerateDialog(true);
  };

  const handleGenerateSuccess = (documentId?: string) => {
    setShowGenerateDialog(false);

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });

    if (onDocumentGenerated) {
      onDocumentGenerated();
    }

    // Redirect to edit page if we have a document ID
    if (documentId) {
      setIsNavigating(true);
      router.push(
        `/compliance/documents/${documentId}/edit?mode=edit&backTo=${encodeURIComponent(`/compliance?module=${moduleNumber}`)}`,
      );
    }
  };

  const handleEdit = () => {
    if (subModule.document?.id) {
      setIsNavigating(true);
      router.push(
        `/compliance/documents/${subModule.document.id}/edit?mode=edit&backTo=${encodeURIComponent(`/compliance?module=${moduleNumber}`)}`,
      );
    }
  };

  const hasDocument = !!subModule.document;

  // Render card with document (enhanced 3-line layout)
  if (hasDocument) {
    return (
      <>
        <div
          onClick={!isNavigating ? handleEdit : undefined}
          aria-disabled={isNavigating}
          className={`group relative ${isNavigating ? "cursor-not-allowed opacity-80" : "cursor-pointer"} rounded-lg border border-border bg-card/50 shadow-sm transition-all duration-200 hover:bg-card hover:shadow-md dark:hover:bg-card/80 ${
            isNested ? "border-l-4" : ""
          }`}
          style={isNested ? { borderLeftColor: `var(--primary)` } : {}}
        >
          <div className="space-y-3 p-4">
            {/* Line 1: Icon + Code + Title + Status Badge */}
            <div className="flex min-w-0 items-start gap-3">
              {/* Icon + Code */}
              <div className="flex shrink-0 items-center gap-2.5">
                {/* Enhanced icon with completion indicator */}
                <div className={`relative rounded-md p-1.5 ${colors.bg}`}>
                  <FileText className={`h-3.5 w-3.5 ${colors.text}`} />
                  {isPublished && (
                    <div className="-right-1.5 -top-1.5 absolute flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-white dark:ring-slate-950">
                      <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <span
                  className={`font-mono font-semibold text-xs ${colors.text}`}
                >
                  {subModule.code}
                </span>
              </div>

              {/* Title */}
              <h3 className="min-w-0 flex-1 font-medium text-sm leading-5">
                {subModule.name}
              </h3>

              {/* Status Badge */}
              <Badge
                variant={status.variant}
                className={`shrink-0 gap-1.5 px-2.5 py-0.5 font-medium text-[11px] ${status.className}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>{" "}
            {/* Line 2: Metadata (requirements count + compliance scores) */}
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              {subModule.questionsCount !== undefined &&
                subModule.questionsCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">
                      {subModule.questionsCount}
                    </span>
                    <span>requirements</span>
                  </span>
                )}

              {subModule.document?.analysisScore && (
                <>
                  <span className="hidden text-muted-foreground/50 sm:inline">
                    •
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {subModule.document.analysisScore.overallScore !==
                      undefined && (
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-muted-foreground/70">
                          Overall Score -
                        </span>
                        <span
                          className={`font-medium ${
                            subModule.document.analysisScore.overallScore > 85
                              ? "text-emerald-600 dark:text-emerald-400"
                              : subModule.document.analysisScore.overallScore >=
                                  75
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {Math.round(
                            subModule.document.analysisScore.overallScore,
                          )}
                          %
                        </span>
                      </span>
                    )}
                    {subModule.document.analysisScore.auditReadinessScore !==
                      undefined && (
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-muted-foreground/70">
                          Audit Score -
                        </span>
                        <span
                          className={`font-medium ${
                            subModule.document.analysisScore
                              .auditReadinessScore > 85
                              ? "text-emerald-600 dark:text-emerald-400"
                              : subModule.document.analysisScore
                                    .auditReadinessScore >= 75
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {Math.round(
                            subModule.document.analysisScore
                              .auditReadinessScore,
                          )}
                          %
                        </span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Line 3: Version + Updated info + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-primary/20 border-t pt-3 dark:border-primary/30">
              {/* Version and Update Info */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
                  <span className="font-semibold">
                    v{subModule.document!.version}
                  </span>
                </span>

                {subModule.document!.updatedAt && (
                  <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatRelativeTime(subModule.document!.updatedAt)}
                    </span>
                  </span>
                )}

                {updatedByUser && (
                  <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {updatedByUser?.firstName ||
                        updatedByUser?.email ||
                        "Unknown"}
                    </span>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                  disabled={isNavigating}
                >
                  <FileEdit className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">View / Edit</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (subModule.document) {
                          setRevisionHistoryDocId(subModule.document.id);
                          setRevisionHistoryDocTitle(subModule.document.title);
                          setShowRevisionHistory(true);
                        }
                      }}
                    >
                      <History className="mr-2 h-4 w-4" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Document Generation Dialog */}
        <GenerateDocumentDialog
          open={showGenerateDialog}
          onClose={() => setShowGenerateDialog(false)}
          moduleNumber={moduleNumber}
          moduleName={moduleName}
          subModuleCode={subModule.code}
          subModuleName={subModule.name}
          onSuccess={handleGenerateSuccess}
        />

        {/* Evidence Upload Flow */}
        <EvidenceUploadFlow
          open={showEvidenceFlow}
          onClose={() => setShowEvidenceFlow(false)}
          subModuleId={subModule.code}
          subModuleName={subModule.name}
          onAnalysisComplete={(documentId, analysis) => {
            // The documentId parameter now contains the actual document ID from the API response
            handleUploadSuccess(documentId);
          }}
        />

        {/* Revision History Dialog */}
        {revisionHistoryDocId && (
          <RevisionHistoryDialog
            open={showRevisionHistory}
            onOpenChange={(open) => {
              setShowRevisionHistory(open);
              if (!open) {
                setRevisionHistoryDocId(null);
                setRevisionHistoryDocTitle(null);
              }
            }}
            documentId={revisionHistoryDocId}
            documentTitle={revisionHistoryDocTitle || "Document"}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{subModule.document?.title}"?
                <br />
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Render card without document (simple 2-line layout - original design)
  return (
    <>
      <div
        className={`group relative rounded-lg border border-border border-dashed bg-card transition-all duration-200 hover:border-border/80 hover:bg-accent/50 ${
          isNested ? "border-l-4" : ""
        }`}
        style={isNested ? { borderLeftColor: `hsl(var(--primary))` } : {}}
      >
        <div className="space-y-3 p-4">
          {/* Line 1: Icon + Code + Title + Status Badge (desktop) */}
          <div className="flex min-w-0 items-center gap-3">
            {/* Icon + Code */}
            <div className="flex shrink-0 items-center gap-2.5">
              <div className={`rounded-md p-1.5 ${colors.bg}`}>
                <FileText className={`h-3.5 w-3.5 ${colors.text}`} />
              </div>
              <span
                className={`font-mono font-semibold text-xs ${colors.text}`}
              >
                {subModule.code}
              </span>
            </div>

            {/* Title */}
            <h3 className="min-w-0 flex-1 font-medium text-sm">
              {subModule.name}
            </h3>

            {/* Status Badge - Desktop only */}
            <Badge
              variant={status.variant}
              className={`hidden shrink-0 gap-1.5 px-2.5 py-0.5 font-medium text-[11px] sm:flex ${status.className}`}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Line 2: Metadata + Status Badge (mobile) */}
          <div className="flex flex-wrap items-center gap-2">
            {subModule.questionsCount !== undefined &&
              subModule.questionsCount > 0 && (
                <>
                  <span className="font-medium text-muted-foreground text-xs">
                    {subModule.questionsCount}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    requirements
                  </span>
                </>
              )}

            {/* Status Badge - Mobile only */}
            <Badge
              variant={status.variant}
              className={`gap-1.5 px-2.5 py-0.5 font-medium text-[11px] sm:hidden ${status.className}`}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Line 3: Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={handleCreate}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate</span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={handleUpload}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Document Generation Dialog */}
      <GenerateDocumentDialog
        open={showGenerateDialog}
        onClose={() => setShowGenerateDialog(false)}
        moduleNumber={moduleNumber}
        moduleName={moduleName}
        subModuleCode={subModule.code}
        subModuleName={subModule.name}
        onSuccess={handleGenerateSuccess}
      />

      {/* Evidence Upload Flow */}
      <EvidenceUploadFlow
        open={showEvidenceFlow}
        onClose={() => setShowEvidenceFlow(false)}
        subModuleId={subModule.code}
        subModuleName={subModule.name}
        onAnalysisComplete={(documentId, analysis) => {
          // The documentId parameter now contains the actual document ID from the API response
          handleUploadSuccess(documentId);
        }}
      />

      {/* Revision History Dialog */}
      {revisionHistoryDocId && (
        <RevisionHistoryDialog
          open={showRevisionHistory}
          onOpenChange={(open) => {
            setShowRevisionHistory(open);
            if (!open) {
              setRevisionHistoryDocId(null);
              setRevisionHistoryDocTitle(null);
            }
          }}
          documentId={revisionHistoryDocId}
          documentTitle={revisionHistoryDocTitle || "Document"}
        />
      )}
    </>
  );
}
