"use client";

import Link from "next/link";
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
import { ClipboardList, Calendar, User, ExternalLink } from "lucide-react";

interface ExecutionHistoryItem {
  job_id: string;
  performed_by: string;
  performed_by_name: string;
  performed_at: Date;
  notes: string | null;
}

interface TemplateExecutionHistoryTableProps {
  history: ExecutionHistoryItem[];
}

export function TemplateExecutionHistoryTable({ history }: TemplateExecutionHistoryTableProps) {
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

  return (
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/compliance/jobs/${item.job_id}`}>
                          View Job
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
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
  );
}
