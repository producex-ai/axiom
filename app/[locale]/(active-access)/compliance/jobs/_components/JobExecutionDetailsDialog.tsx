"use client";

import { Calendar, User, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ActionField {
  field_key: string;
  field_label: string;
  field_type: string;
  value: any;
}

interface JobExecutionDetails {
  job_id: string;
  performed_by_name: string;
  performed_at: Date | string;
  notes: string | null;
  creation_values?: ActionField[];
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Job Execution Details</DialogTitle>
          <DialogDescription>
            Complete information for this job execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Execution Info */}
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">Performed By</span>
              </div>
              <p className="pl-5">{execution.performed_by_name}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium">Executed On</span>
              </div>
              <p className="pl-5">
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

          {/* Creation Fields */}
          {execution.creation_values && execution.creation_values.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Creation Fields</h3>
                  <Badge variant="outline" className="text-xs">
                    {execution.creation_values.length}
                  </Badge>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px] md:w-[250px]">Field</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {execution.creation_values.map((field) => (
                        <TableRow key={field.field_key}>
                          <TableCell className="font-medium align-top">
                            {field.field_label}
                          </TableCell>
                          <TableCell className="break-words">
                            {formatFieldValue(field)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Action Fields */}
          {execution.action_values && execution.action_values.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Action Fields</h3>
                  <Badge variant="outline" className="text-xs">
                    {execution.action_values.length}
                  </Badge>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px] md:w-[250px]">Field</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {execution.action_values.map((field) => (
                        <TableRow key={field.field_key}>
                          <TableCell className="font-medium align-top">
                            {field.field_label}
                          </TableCell>
                          <TableCell className="break-words">
                            {formatFieldValue(field)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {execution.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Notes
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {execution.notes}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* No Creation Fields, Action Fields and No Notes */}
          {(!execution.creation_values || execution.creation_values.length === 0) &&
            (!execution.action_values || execution.action_values.length === 0) &&
            !execution.notes && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground italic">
                  No creation fields, action fields, or notes recorded for this execution
                </p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
