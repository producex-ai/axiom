"use client";

import { Calendar, User, FileText, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ActionField {
  field_key: string;
  field_label: string;
  field_type: string;
  value: any;
}

interface JobExecutionDetails {
  job_title: string;
  job_id: string;
  performed_by_name: string;
  performed_at: Date | string;
  notes: string | null;
  action_values: ActionField[];
}

interface JobExecutionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  execution: JobExecutionDetails | null;
}

export function JobExecutionDetailsDialog({
  open,
  onOpenChange,
  execution,
}: JobExecutionDetailsDialogProps) {
  if (!execution) return null;

  const performedDate = new Date(execution.performed_at);

  const formatFieldValue = (field: ActionField) => {
    if (field.value === null || field.value === undefined) {
      return "—";
    }

    switch (field.field_type) {
      case "checkbox":
        return field.value ? "Yes" : "No";
      case "date":
        try {
          return new Date(field.value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } catch {
          return field.value;
        }
      case "number":
        return field.value.toString();
      case "select":
      case "text":
      case "textarea":
      default:
        return field.value.toString();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Job Execution Details</DialogTitle>
          <DialogDescription>
            Complete information for this job execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Job Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Job Title
              </div>
              <p className="text-base font-semibold">{execution.job_title}</p>
            </div>

            <Separator />

            {/* Execution Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Performed By
                </div>
                <p className="text-sm">{execution.performed_by_name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Executed On
                </div>
                <p className="text-sm">
                  {performedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {performedDate.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Action Fields */}
            {execution.action_values && execution.action_values.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Action Fields</h3>
                  <Badge variant="outline" className="text-xs">
                    {execution.action_values.length} fields
                  </Badge>
                </div>
                <div className="space-y-4">
                  {execution.action_values.map((field) => (
                    <div
                      key={field.field_key}
                      className="rounded-lg border bg-muted/30 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          {field.field_label}
                        </label>
                        <Badge variant="secondary" className="text-xs">
                          {field.field_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground/90 break-words">
                        {formatFieldValue(field)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {execution.notes && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notes
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                      {execution.notes}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* No Action Fields and No Notes */}
            {(!execution.action_values || execution.action_values.length === 0) &&
              !execution.notes && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground italic">
                    No action fields or notes recorded for this execution
                  </p>
                </div>
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
