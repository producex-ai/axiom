"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateJobSchema, type UpdateJobInput } from "@/lib/validators/jobValidators";
import { updateJob } from "@/lib/actions/jobActions";
import type { Job } from "@/lib/services/jobService";
import type { OrgMember } from "@/actions/clerk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JobFormFields } from "./JobFormFields";

interface JobEditFormProps {
  job: Job;
  members: OrgMember[];
}

export function JobEditForm({ job, members }: JobEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateJobInput>({
    resolver: zodResolver(updateJobSchema),
    defaultValues: {
      id: job.id,
      assigned_to: job.assigned_to,
      frequency: job.frequency,
      next_execution_date: new Date(job.next_execution_date).toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: UpdateJobInput) => {
    setIsSubmitting(true);
    try {
      const result = await updateJob(data);
      if (result.success) {
        toast({
          title: "Job updated",
          description: "Job has been updated successfully.",
        });
        router.push(`/compliance/jobs/${job.id}`);
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update job",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>
              Update the job details below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <JobFormFields 
              control={form.control} 
              members={members}
              showFrequencyAndDate={true}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/compliance/jobs/${job.id}`)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
