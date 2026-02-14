"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Pencil,
  User,
} from "lucide-react";
import { useState } from "react";
import type { OrgMember } from "@/actions/clerk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditAssignmentDialog } from "./EditAssignmentDialog";

interface TemplateDetailsViewProps {
  logId: string;
  templateName: string;
  templateCategory?: string | null;
  templateSop?: string | null;
  assigneeId: string;
  assigneeName?: string | null;
  reviewerId: string | null;
  reviewerName?: string | null;
  logDate: Date;
  completedTasks: number;
  totalTasks: number;
  canEditAssignments?: boolean;
  members?: OrgMember[];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TemplateDetailsView({
  logId,
  templateName,
  templateCategory,
  templateSop,
  assigneeId,
  assigneeName,
  reviewerId,
  reviewerName,
  logDate,
  completedTasks,
  totalTasks,
  canEditAssignments = false,
  members = [],
}: TemplateDetailsViewProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Template and SOP */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-medium">Template</span>
          </div>
          <p className="mt-1 font-semibold">{templateName}</p>
          {templateCategory && (
            <Badge variant="outline" className="mt-2">
              {templateCategory}
            </Badge>
          )}
        </div>

        {templateSop && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="flex items-center gap-2 font-semibold text-sm">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              Standard Operating Procedure
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground text-sm">
              {templateSop}
            </p>
          </div>
        )}
      </div>

      {/* Assignee and Reviewer */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Assignee</span>
            </div>
            {canEditAssignments && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit assignments</span>
              </Button>
            )}
          </div>
          <p className="mt-1 font-semibold">{assigneeName || "Unassigned"}</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="h-4 w-4" />
              <span className="font-medium">Reviewer</span>
            </div>
            {canEditAssignments && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit assignments</span>
              </Button>
            )}
          </div>
          <p className="mt-1 font-semibold">{reviewerName || "Not assigned"}</p>
        </div>
      </div>

      {/* Progress and Log Date */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Progress</span>
          </div>
          <p className="mt-1 font-semibold">
            {completedTasks} / {totalTasks} tasks
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${
                  totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Log Date</span>
          </div>
          <p className="mt-1 font-semibold">{formatDate(logDate)}</p>
        </div>
      </div>

      {canEditAssignments && members.length > 0 && (
        <EditAssignmentDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          logId={logId}
          currentAssigneeId={assigneeId}
          currentReviewerId={reviewerId}
          members={members}
        />
      )}
    </div>
  );
}
