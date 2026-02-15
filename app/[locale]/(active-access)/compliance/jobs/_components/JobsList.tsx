"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobWithTemplate } from "@/lib/services/jobService";
import type { JobStatus } from "@/lib/validators/jobValidators";
import { Calendar, User, Clock } from "lucide-react";
import { JobActionsDropdown } from "./JobActionsDropdown";
import { FREQUENCY_LABELS } from "@/lib/cron/cron-utils";

interface JobsListProps {
  jobs: Array<JobWithTemplate & { derived_status: JobStatus; assigned_to_name: string }>;
  currentUserId: string;
}

const statusConfig: Record<
  JobStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; color: string }
> = {
  OVERDUE: {
    variant: "destructive",
    label: "Overdue",
    color: "text-red-600",
  },
  DUE: {
    variant: "default",
    label: "Due",
    color: "text-blue-600",
  },
  COMPLETED: {
    variant: "secondary",
    label: "Completed",
    color: "text-green-600",
  },
  UPCOMING: {
    variant: "outline",
    label: "Upcoming",
    color: "text-gray-600",
  },
};

export function JobsList({ jobs, currentUserId }: JobsListProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No jobs found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a job from a template to get started
              </p>
            </div>
            <Button asChild>
              <Link href="/compliance/jobs/create">Create Job</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => {
        const statusInfo = statusConfig[job.derived_status];
        const nextExecution = new Date(job.next_execution_date);

        return (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg line-clamp-1">
                    {job.template_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {job.template_category}
                      </Badge>
                    </span>
                    {job.template_description && (
                      <span className="text-muted-foreground truncate">
                        {job.template_description}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant={statusInfo.variant}>
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {nextExecution.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>
                      {FREQUENCY_LABELS[job.frequency]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span className="truncate max-w-[150px]">
                      {job.assigned_to_name}
                    </span>
                  </div>
                </div>
                <JobActionsDropdown
                  jobId={job.id}
                  jobTitle={job.template_name}
                  assignedTo={job.assigned_to}
                  currentUserId={currentUserId}
                  actionFields={[]}
                  onActionComplete={() => window.location.reload()}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
