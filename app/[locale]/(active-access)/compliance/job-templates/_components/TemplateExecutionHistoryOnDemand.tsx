"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Calendar, User, Eye, Loader2 } from "lucide-react";
import { getJobsByTemplateId } from "@/lib/actions/jobActions";
import { JobExecutionDetailsDialog } from "../../jobs/_components/JobExecutionDetailsDialog";

interface ActionField {
  field_key: string;
  field_label: string;
  field_type: string;
  value: any;
}

interface ExecutionHistoryItem {
  job_id: string;
  performed_by: string;
  performed_by_name: string;
  performed_at: Date;
  notes: string | null;
  action_values: ActionField[];
}

interface TemplateExecutionHistoryOnDemandProps {
  templateId: string;
}

export function TemplateExecutionHistoryOnDemand({ templateId }: TemplateExecutionHistoryOnDemandProps) {
  const [history, setHistory] = useState<ExecutionHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistoryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getJobsByTemplateId(templateId);
      if (result.success && result.data) {
        setHistory(result.data.execution_history || []);
      } else {
        setError(result.error || "Failed to load execution history");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error loading execution history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item: ExecutionHistoryItem) => {
    setSelectedExecution(item);
    setDialogOpen(true);
  };

  // Not loaded yet - show load button
  if (history === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>
            Recent executions of jobs from this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-sm mb-2">Load execution history</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click the button below to view recent executions
              </p>
              <Button onClick={loadHistory} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Load History
              </Button>
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loaded but empty
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>
            Recent executions of jobs from this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-sm">No executions yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Execute jobs to see their history here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show the history table
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Execution History ({history.length})</CardTitle>
          <CardDescription>
            Recent executions of jobs from this template (latest 100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Executed On</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item, index) => {
                  const performedDate = new Date(item.performed_at);

                  return (
                    <TableRow key={`${item.job_id}-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {performedDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          {' at '}
                          {performedDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">
                            {item.performed_by_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.notes ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                            {item.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            No notes
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <JobExecutionDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        execution={selectedExecution}
      />
    </>
  );
}
