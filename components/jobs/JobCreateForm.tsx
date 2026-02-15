"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createJobSchema, type CreateJobInput } from "@/lib/validators/jobValidators";
import { createJob } from "@/lib/actions/jobActions";
import { getJobTemplates } from "@/lib/actions/jobTemplateActions";
import type { JobTemplateWithFields } from "@/lib/services/jobTemplateService";
import type { OrgMember } from "@/actions/clerk";
import { FREQUENCY_LABELS, type ScheduleFrequency } from "@/lib/cron/cron-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { JobFormFields } from "./JobFormFields";

interface JobCreateFormProps {
  members: OrgMember[];
  preselectedTemplateId?: string;
}

export function JobCreateForm({ members, preselectedTemplateId }: JobCreateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<JobTemplateWithFields[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplateWithFields | null>(null);

  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      template_id: "",
      assigned_to: "",
      frequency: "monthly",
      next_execution_date: "",
      creation_field_values: {},
    },
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (preselectedTemplateId && templates.length > 0 && !selectedTemplate) {
      const template = templates.find((t) => t.id === preselectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
        form.setValue("template_id", template.id);
        // Trigger a re-render by resetting the form with the new value
        form.reset({
          ...form.getValues(),
          template_id: template.id,
        });
      }
    }
  }, [preselectedTemplateId, templates]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const result = await getJobTemplates();
      if (result.success && result.data) {
        setTemplates(result.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);
    form.setValue("template_id", templateId);
    form.setValue("creation_field_values", {});
  };

  const onSubmit = async (data: CreateJobInput) => {
    setIsSubmitting(true);
    try {
      const result = await createJob(data);
      if (result.success) {
        toast({
          title: "Job created",
          description: "Job has been created successfully.",
        });
        router.push("/compliance/jobs");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create job",
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

  const creationFields = selectedTemplate?.fields.filter(
    (f) => f.field_category === "creation"
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
            <CardDescription>
              Basic information about the job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template, Frequency, and Date - 3 columns on desktop, stack on mobile */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="template_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template</FormLabel>
                    <Select
                      onValueChange={handleTemplateChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.entries(FREQUENCY_LABELS) as [
                            ScheduleFrequency,
                            string,
                          ][]
                        ).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="next_execution_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Execution Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        className="w-full"
                        {...field}
                        value={typeof field.value === 'string' ? field.value : field.value?.toISOString().split('T')[0] || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Title and Assignee */}
            <JobFormFields 
              control={form.control} 
              members={members}
              showFrequencyAndDate={false}
            />
          </CardContent>
        </Card>

        {selectedTemplate && creationFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Creation Fields</CardTitle>
              <CardDescription>
                Additional information required for this job
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicFieldRenderer
                fields={creationFields}
                values={form.watch("creation_field_values")}
                onChange={(values) => form.setValue("creation_field_values", values)}
                errors={form.formState.errors.creation_field_values}
              />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !selectedTemplate}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Job
          </Button>
        </div>
      </form>
    </Form>
  );
}
