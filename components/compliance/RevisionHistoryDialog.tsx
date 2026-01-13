"use client";

import { useEffect, useState } from "react";
import { Clock, History, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DocumentRevisionInfo,
  formatAction,
  formatRelativeTime,
  getActionColor,
  formatRevisionDate,
} from "@/lib/compliance/revision-history";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/lib/compliance/queries";

interface RevisionItemProps {
  revision: DocumentRevisionInfo;
  isLast: boolean;
  index: number;
}

function RevisionItem({ revision, isLast, index }: RevisionItemProps) {
  const { data: revisionUser } = useUserProfile(revision.userId);
  const { date, time } = formatRevisionDate(revision.createdAt);
  const relativeTime = formatRelativeTime(revision.createdAt);

  return (
    <div className="relative pb-4 last:pb-0">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 w-0.5 h-12 bg-border" />
      )}

      {/* Timeline dot */}
      <div className="absolute left-0 top-0 w-9 h-9 rounded-full bg-background border-2 border-primary flex items-center justify-center">
        <Clock className="h-4 w-4 text-primary" />
      </div>

      {/* Content */}
      <div className="ml-14 pt-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={getActionColor(revision.action)}
            >
              {formatAction(revision.action)}
            </Badge>
            <Badge variant="secondary">v{revision.version}</Badge>
            {revision.status === "published" && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
              >
                Published
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-1 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>
            {revisionUser
              ? `${revisionUser.firstName || ""} ${revisionUser.lastName || ""}`.trim() ||
                revisionUser.email
              : "Unknown User"}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          {date} at {time}
        </p>
        <p className="text-sm text-muted-foreground">{relativeTime}</p>

        {revision.notes && (
          <p className="text-sm mt-2 text-foreground">{revision.notes}</p>
        )}
      </div>
    </div>
  );
}

interface RevisionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function RevisionHistoryDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: RevisionHistoryDialogProps) {
  const [revisions, setRevisions] = useState<DocumentRevisionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/compliance/documents/${documentId}/history`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch revision history");
        }

        const data = await response.json();
        setRevisions(data.revisions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, documentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Revision History
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">{documentTitle}</p>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        ) : revisions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No revision history available
          </div>
        ) : (
          <div className="space-y-4">
            {revisions.map((revision, index) => (
              <RevisionItem
                key={revision.id}
                revision={revision}
                isLast={index === revisions.length - 1}
                index={index}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
