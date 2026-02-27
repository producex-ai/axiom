"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Calendar, User, Clock, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import { JobActionsDropdown } from "./JobActionsDropdown";
import { FREQUENCY_LABELS } from "@/lib/cron/cron-utils";

interface JobsByTemplateGroupProps {
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

export function JobsByTemplateGroup({ jobs, currentUserId }: JobsByTemplateGroupProps) {
  // Group jobs by template
  const jobsByTemplate = jobs.reduce((acc, job) => {
    const key = job.template_id;
    if (!acc[key]) {
      acc[key] = {
        template_id: job.template_id,
        template_name: job.template_name,
        template_category: job.template_category,
        jobs: [],
      };
    }
    acc[key].jobs.push(job);
    return acc;
  }, {} as Record<string, {
    template_id: string;
    template_name: string;
    template_category: string;
    jobs: Array<JobWithTemplate & { derived_status: JobStatus; assigned_to_name: string }>;
  }>);

  const templates = Object.values(jobsByTemplate);

  // Track open state for each template
  const [openTemplates, setOpenTemplates] = useState<Record<string, boolean>>(
    templates.reduce((acc, template) => {
      acc[template.template_id] = true; // All open by default
      return acc;
    }, {} as Record<string, boolean>)
  );

  const toggleTemplate = (templateId: string) => {
    setOpenTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground" />
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
    <div className="space-y-4">
      {templates.map((template) => {
        const isOpen = openTemplates[template.template_id];
        const statusCounts = template.jobs.reduce((acc, job) => {
          acc[job.derived_status] = (acc[job.derived_status] || 0) + 1;
          return acc;
        }, {} as Record<JobStatus, number>);

        return (
          <Card key={template.template_id}>
            <Collapsible
              open={isOpen}
              onOpenChange={() => toggleTemplate(template.template_id)}
            >
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.template_category} • {template.jobs.length} {template.jobs.length === 1 ? 'job' : 'jobs'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusCounts.OVERDUE > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {statusCounts.OVERDUE} Overdue
                        </Badge>
                      )}
                      {statusCounts.OPEN > 0 && (
                        <Badge variant="default" className="text-xs">
                          {statusCounts.OPEN} Open
                        </Badge>
                      )}
                      {statusCounts.COMPLETED > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {statusCounts.COMPLETED} Completed
                        </Badge>
                      )}
                      {statusCounts.UPCOMING > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {statusCounts.UPCOMING} Upcoming
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link href={`/compliance/job-templates/${template.template_id}`}>
                          View Template
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0">
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
                        {template.jobs.map((job) => {
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
                                  jobTitle={template.template_name}
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
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
