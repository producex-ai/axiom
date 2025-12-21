"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileEdit,
  FileText,
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
import { useQueryClient } from "@tanstack/react-query";
import GenerateDocumentDialog from "@/components/compliance/GenerateDocumentDialog";
import UploadDocumentDialog from "@/components/compliance/UploadDocumentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { complianceKeys, useUserProfile } from "@/lib/compliance/queries";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
          "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400",
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
            "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400",
        };
      case "draft":
        return {
          icon: Clock,
          label: "Draft",
          variant: "outline" as const,
          className:
            "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400",
        };
      case "archived":
        return {
          icon: AlertCircle,
          label: "Archived",
          variant: "outline" as const,
          className:
            "bg-slate-500/10 text-slate-600 border-slate-200 dark:text-slate-400",
        };
      default:
        return {
          icon: AlertCircle,
          label: "Unknown",
          variant: "outline" as const,
          className: "bg-slate-500/10 text-slate-600 border-slate-200",
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
      await queryClient.invalidateQueries({ queryKey: complianceKeys.overview() });
      
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
    setShowUploadDialog(true);
  };

  const handleUploadSuccess = () => {
    setShowUploadDialog(false);
    if (onDocumentGenerated) {
      onDocumentGenerated();
    }
  };

  const handleCreate = () => {
    setShowGenerateDialog(true);
  };

  const handleGenerateSuccess = () => {
    setShowGenerateDialog(false);
    if (onDocumentGenerated) {
      onDocumentGenerated();
    }
  };

  const handleView = () => {
    if (subModule.document?.id) {
      setIsNavigating(true);
      router.push(
        `/dashboard/compliance/documents/${subModule.document.id}/edit?mode=view&backTo=${encodeURIComponent(`/dashboard/compliance?module=${moduleNumber}`)}`,
      );
    }
  };

  const handleEdit = () => {
    if (subModule.document?.id) {
      setIsNavigating(true);
      router.push(
        `/dashboard/compliance/documents/${subModule.document.id}/edit?mode=edit&backTo=${encodeURIComponent(`/dashboard/compliance?module=${moduleNumber}`)}`,
      );
    }
  };

  const hasDocument = !!subModule.document;

  // Render card with document (enhanced 3-line layout)
  if (hasDocument) {
    return (
      <div
        className={`group relative rounded-lg border transition-all duration-200 border-emerald-200 bg-emerald-50/30 shadow-sm shadow-emerald-100/50 hover:shadow-md hover:shadow-emerald-100/50 dark:border-emerald-900/50 dark:bg-emerald-950/10 ${
          isNested ? "border-l-4" : ""
        }`}
        style={
          isNested ? { borderLeftColor: `rgb(16 185 129)` } : {}
        }
      >
      <div className="space-y-3 p-4">
        {/* Line 1: Icon + Code + Title + Status Badge */}
        <div className="flex min-w-0 items-start gap-3">
          {/* Icon + Code */}
          <div className="flex shrink-0 items-center gap-2.5">
            {/* Enhanced icon with completion indicator */}
            <div
              className={`relative rounded-md p-1.5 ${colors.bg} ${
                isPublished
                  ? "ring-2 ring-emerald-400/30 ring-offset-1"
                  : ""
              }`}
            >
              <FileText className={`h-3.5 w-3.5 ${colors.text}`} />
              {isPublished && (
                <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <span className={`font-mono font-semibold text-xs ${colors.text}`}>
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
        </div>          {/* Line 2: Metadata (requirements count) */}
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            {subModule.questionsCount !== undefined &&
              subModule.questionsCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">{subModule.questionsCount}</span>
                  <span>requirements</span>
                </span>
              )}
          </div>

          {/* Line 3: Version + Updated info + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-slate-200 border-t pt-3 dark:border-slate-800">
            {/* Version and Update Info */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-emerald-600 text-xs dark:text-emerald-400">
                <span className="font-semibold">v{subModule.document!.version}</span>
              </span>
              
              {subModule.document!.updatedAt && (
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(subModule.document!.updatedAt)}</span>
                </span>
              )}

              {updatedByUser && (
                <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <User className="h-3 w-3" />
                  <span className="truncate">
                    {updatedByUser.firstName} {updatedByUser.lastName}
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
                onClick={handleEdit}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileEdit className="h-3.5 w-3.5" />
                )}
                <span>Edit</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
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

        {/* Document Upload Dialog */}
        <UploadDocumentDialog
          open={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          moduleNumber={moduleNumber}
          subModuleCode={subModule.code}
          subModuleName={subModule.name}
          onSuccess={handleUploadSuccess}
        />

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
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Render card without document (simple 2-line layout - original design)
  return (
    <div
      className={`group relative rounded-lg border border-dashed transition-all duration-200 border-border bg-card hover:border-border/80 hover:bg-accent/50 ${
        isNested ? "border-l-4" : ""
      }`}
      style={
        isNested ? { borderLeftColor: `hsl(var(--primary))` } : {}
      }
    >
      <div className="space-y-3 p-4">
        {/* Line 1: Icon + Code + Title + Status Badge (desktop) */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Icon + Code */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div className={`rounded-md p-1.5 ${colors.bg}`}>
              <FileText className={`h-3.5 w-3.5 ${colors.text}`} />
            </div>
            <span className={`font-mono font-semibold text-xs ${colors.text}`}>
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
                <span className="font-medium text-muted-foreground text-xs">{subModule.questionsCount}</span>
                <span className="text-muted-foreground text-xs">requirements</span>
              </>
            )}
          
          {/* Status Badge - Mobile only */}
          <Badge
            variant={status.variant}
            className={`sm:hidden gap-1.5 px-2.5 py-0.5 font-medium text-[11px] ${status.className}`}
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
            onClick={handleUpload}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload</span>
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={handleCreate}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Create</span>
          </Button>
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

      {/* Document Upload Dialog */}
      <UploadDocumentDialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        moduleNumber={moduleNumber}
        subModuleCode={subModule.code}
        subModuleName={subModule.name}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
