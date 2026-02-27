"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobWithTemplate } from "@/lib/services/jobService";
import type { JobStatus } from "@/lib/validators/jobValidators";
import { Calendar, Clock, User } from "lucide-react";
import { JobActionsDropdown } from "../../jobs/_components/JobActionsDropdown";
import { FREQUENCY_LABELS } from "@/lib/cron/cron-utils";

interface TemplateJobsTableProps {
  jobs: Array<JobWithTemplate & { derived_status: JobStatus; assigned_to_name: string }>;
  currentUserId: string;
}

const statusConfig: Record<
  JobStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  OVERDUE: {
    variant: "destructive",
    label: "Overdue",
  },
  OPEN: {
    variant: "default",
    label: "Open",
  },
  COMPLETED: {
    variant: "secondary",
    label: "Completed",
  },
  UPCOMING: {
    variant: "outline",
    label: "Upcoming",
  },
};

export function TemplateJobsTable({ jobs, currentUserId }: TemplateJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>
            Jobs created from this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-sm">No jobs scheduled</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a job from this template to get started
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
        <CardTitle>Scheduled Jobs ({jobs.length})</CardTitle>
        <CardDescription>
          All jobs created from this template
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Next Execution</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const statusInfo = statusConfig[job.derived_status];
                const nextExecution = new Date(job.next_execution_date);

                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {nextExecution.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {FREQUENCY_LABELS[job.frequency]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">
                          {job.assigned_to_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <JobActionsDropdown
                        jobId={job.id}
                        jobTitle={job.template_name}
                        assignedTo={job.assigned_to}
                        currentUserId={currentUserId}
                        actionFields={[]}
                        onActionComplete={() => window.location.reload()}
                      />
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
