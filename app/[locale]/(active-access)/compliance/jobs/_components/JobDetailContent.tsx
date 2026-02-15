"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DynamicFieldRenderer } from "../../_components/DynamicFieldRenderer";
import { executeJobActionSchema, type ExecuteJobActionInput } from "@/lib/validators/jobValidators";
import { executeJobAction } from "@/lib/actions/jobActions";
import type { JobDetail } from "@/lib/services/jobService";
import { Calendar, User, Clock, Loader2 } from "lucide-react";
import type { JobStatus } from "@/lib/validators/jobValidators";
import { FREQUENCY_LABELS } from "@/lib/cron/cron-utils";
import { useToast } from "@/hooks/use-toast";
import { canExecuteJob } from "@/lib/utils/job-cycle-utils";

const statusConfig: Record<
  JobStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  OVERDUE: { variant: "destructive", label: "Overdue" },
  DUE: { variant: "default", label: "Due" },
  COMPLETED: { variant: "secondary", label: "Completed" },
  UPCOMING: { variant: "outline", label: "Upcoming" },
};

interface JobDetailContentProps {
  jobId: string;
  currentUserId: string;
}

export function JobDetailContent({ jobId, currentUserId }: JobDetailContentProps) {
  const { toast } = useToast();
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExecuteJobActionInput>({
    resolver: zodResolver(executeJobActionSchema),
    defaultValues: {
      job_id: jobId,
      notes: "",
      action_field_values: {},
    },
  });

  useEffect(() => {
    loadJobDetail();
  }, [jobId]);

  const loadJobDetail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          notFound();
        }
        throw new Error("Failed to load job");
      }
      const data = await response.json();
      setJobDetail(data);
    } catch (error) {
      console.error("Error loading job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ExecuteJobActionInput) => {
    setIsSubmitting(true);
    try {
      const result = await executeJobAction(data);
      if (result.success) {
        toast({
          title: "Job executed",
          description: "Job execution has been recorded successfully.",
        });
        form.reset({
          job_id: jobId,
          notes: "",
          action_field_values: {},
        });
        loadJobDetail(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to execute job",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!jobDetail) {
    notFound();
  }

  const { job, template, creation_fields, action_fields, derived_status } = jobDetail;

  const statusInfo = statusConfig[derived_status];
  const nextExecution = new Date(job.next_execution_date);
  
  // Check if job can be executed using cycle-window logic
  // User must be assigned AND job must not have been executed in current cycle
  const isAssignedToUser = job.assigned_to === currentUserId;
  const lastExecutionDate = job.last_execution_date ? new Date(job.last_execution_date) : null;
  const canExecuteInCycle = canExecuteJob(lastExecutionDate, nextExecution, job.frequency);
  const canExecute = isAssignedToUser && canExecuteInCycle;

  // Check if all required action fields are filled
  const actionFieldValues = form.watch("action_field_values");
  const allRequiredFieldsFilled = action_fields.every((field) => {
    if (!field.is_required) return true;
    const value = actionFieldValues[field.field_key];
    return value !== undefined && value !== null && value !== "";
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{template.name}</CardTitle>
              <CardDescription className="mt-2 flex items-center gap-2">
                <Badge variant="outline">{template.category}</Badge>
                {template.description && (
                  <span className="text-muted-foreground">
                    {template.description}
                  </span>
                )}
              </CardDescription>
            </div>
            <Badge variant={statusInfo.variant} className="text-sm">
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Next Execution</div>
                <div className="text-muted-foreground">
                  {nextExecution.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Frequency</div>
                <div className="text-muted-foreground">
                  {FREQUENCY_LABELS[job.frequency]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Assignee</div>
                <div className="text-muted-foreground truncate">
                  {job.assigned_to_name}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Creation Information</CardTitle>
          <CardDescription>
            Values provided when this job was created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creation_fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No creation fields
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="creation-fields">
                <AccordionTrigger className="text-sm">
                  View creation fields ({creation_fields.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {creation_fields.map((field) => (
                      <div key={field.field_key} className="border-b pb-3 last:border-b-0">
                        <div className="text-sm font-medium text-muted-foreground">
                          {field.field_label}
                        </div>
                        <div className="mt-1 text-sm">
                          {field.field_type === "checkbox"
                            ? field.value
                              ? "Yes"
                              : "No"
                            : field.value?.toString() || "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>

      {canExecute ? (
        <Card>
          <CardHeader>
            <CardTitle>Execute Job</CardTitle>
            <CardDescription>
              Fill in the required information to complete this job execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {action_fields.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Action Fields</h4>
                    <DynamicFieldRenderer
                      fields={action_fields.map((field) => ({
                        id: field.field_key,
                        template_id: jobId,
                        field_key: field.field_key,
                        field_label: field.field_label,
                        field_type: field.field_type as any,
                        field_category: "action" as const,
                        is_required: field.is_required,
                        display_order: 0,
                        config_json: field.config,
                      }))}
                      values={form.watch("action_field_values")}
                      onChange={(values) => form.setValue("action_field_values", values)}
                      errors={form.formState.errors.action_field_values}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any additional notes or comments..."
                          className="resize-none"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || !allRequiredFieldsFilled}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Review
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Review Job</CardTitle>
            <CardDescription>
              Fill in the required information to complete this job review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground italic">
              {!isAssignedToUser 
                ? "Only the assigned user can execute this job"
                : "This job has already been executed in the current cycle window"}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
