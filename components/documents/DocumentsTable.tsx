"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, Eye, History, MoreVertical, Pencil, Trash2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RevisionHistoryDialog } from "@/components/compliance/RevisionHistoryDialog";
import { UpdateRenewalPeriodDialog } from "@/components/documents/UpdateRenewalPeriodDialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { complianceKeys } from "@/lib/compliance/queries";
import { formatDateWithOrdinal } from "@/lib/utils";

interface Document {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  framework_id: string;
  module_id: string;
  sub_module_id: string;
  current_version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  content_key: string;
  published_at?: string | null;
  renewal?: "quarterly" | "semi_annually" | "annually" | "2_years" | null;
  doc_type?: string | null;
}

export function DocumentsTable({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [revisionHistoryDocId, setRevisionHistoryDocId] = useState<string | null>(null);
  const [revisionHistoryDocTitle, setRevisionHistoryDocTitle] = useState<string | null>(null);
  const [showUpdateRenewal, setShowUpdateRenewal] = useState(false);
  const [updateRenewalDocId, setUpdateRenewalDocId] = useState<string | null>(null);
  const [updateRenewalDocTitle, setUpdateRenewalDocTitle] = useState<string | null>(null);
  const [updateRenewalCurrent, setUpdateRenewalCurrent] = useState<
    "quarterly" | "semi_annually" | "annually" | "2_years" | null
  >(null);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "published":
        return "default";
      case "draft":
        return "secondary";
      case "archived":
        return "outline";
      default:
        return "outline";
    }
  };

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

  const formatRelativeTime = (dateString: string) => {
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

  const calculateDueDate = (publishedAt?: string | null, renewal?: string | null) => {
    if (!publishedAt || !renewal) return "N/A";
    
    const date = new Date(publishedAt);
    
    switch (renewal) {
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "semi_annually":
        date.setMonth(date.getMonth() + 6);
        break;
      case "annually":
        date.setFullYear(date.getFullYear() + 1);
        break;
      case "2_years":
        date.setFullYear(date.getFullYear() + 2);
        break;
      default:
        return "N/A";
    }
    
    return formatDateWithOrdinal(date);
  };

  const handleDownload = async (doc: Document) => {
    try {
      toast.loading("Downloading document...", { id: "download" });

      const response = await fetch(
        `/api/compliance/download?key=${encodeURIComponent(doc.content_key)}`,
      );

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
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
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      toast.loading("Deleting document...", { id: "delete" });

      const response = await fetch(
        `/api/compliance/documents/${deleteTargetId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Delete failed");

      toast.success("Document deleted successfully", { id: "delete" });
      queryClient.invalidateQueries({
        queryKey: complianceKeys.allDocuments(),
      });
      setDeleteDialogOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document", { id: "delete" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateRenewalSuccess = async () => {
    try {
      toast.success("Renewal period updated successfully");
      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({
        queryKey: complianceKeys.allDocuments(),
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    }
  };

  // Pagination
  const totalPages = Math.ceil(documents.length / itemsPerPage);
  const startIdx = currentPage * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedDocuments = documents.slice(startIdx, endIdx);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Version</TableHead>
              <TableHead className="text-center">Last Updated</TableHead>
              <TableHead className="text-center">Due Date</TableHead>
              <TableHead className="text-center">Module</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedDocuments.length > 0 ? (
              paginatedDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-xs truncate font-medium">
                    {doc.title}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={getStatusBadgeVariant(doc.status)}
                      className={getStatusColor(doc.status)}
                    >
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    v{doc.current_version}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm text-center">
                    {formatRelativeTime(doc.updated_at)}
                  </TableCell>
                  <TableCell className="text-sm text-center">
                    {calculateDueDate(doc.published_at, doc.renewal)}
                  </TableCell>
                  <TableCell className="text-sm text-center">
                    {doc.framework_id === "company_docs"
                      ? "Company Document"
                      : `${doc.module_id}.${doc.sub_module_id}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onClick={() => {
                            const basePath = doc.doc_type === "compliance" 
                              ? `/compliance/documents/${doc.id}/edit`
                              : `/documents/${doc.id}/edit`;
                            router.push(basePath);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Manage
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setUpdateRenewalDocId(doc.id);
                            setUpdateRenewalDocTitle(doc.title);
                            setUpdateRenewalCurrent(doc.renewal || null);
                            setShowUpdateRenewal(true);
                          }}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Update Renewal Period
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setRevisionHistoryDocId(doc.id);
                            setRevisionHistoryDocTitle(doc.title);
                            setShowRevisionHistory(true);
                          }}
                        >
                          <History className="mr-2 h-4 w-4" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 dark:text-red-400"
                          onClick={() => {
                            setDeleteTargetId(doc.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No documents found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-muted-foreground text-sm">
          Page {currentPage + 1} of {totalPages || 1}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
            }
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>

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

      {/* Update Renewal Period Dialog */}
      {updateRenewalDocId && (
        <UpdateRenewalPeriodDialog
          open={showUpdateRenewal}
          onOpenChange={(open) => {
            setShowUpdateRenewal(open);
            if (!open) {
              setUpdateRenewalDocId(null);
              setUpdateRenewalDocTitle(null);
              setUpdateRenewalCurrent(null);
            }
          }}
          documentId={updateRenewalDocId}
          documentTitle={updateRenewalDocTitle || "Document"}
          currentRenewal={updateRenewalCurrent}
          onSuccess={handleUpdateRenewalSuccess}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
