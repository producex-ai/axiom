"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { executeJobActionSchema, type ExecuteJobActionInput } from "@/lib/validators/jobValidators";
import { executeJobAction } from "@/actions/jobs/job-actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DynamicFieldRenderer } from "../../_components/DynamicFieldRenderer";

interface ActionExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  actionFields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    is_required: boolean;
    config: Record<string, any>;
  }>;
  onSuccess: () => void;
}

export function ActionExecutionModal({
  isOpen,
  onClose,
  jobId,
  actionFields,
  onSuccess,
}: ActionExecutionModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExecuteJobActionInput>({
    resolver: zodResolver(executeJobActionSchema),
    defaultValues: {
      job_id: jobId,
      notes: "",
      action_field_values: {},
    },
  });

  const onSubmit = async (data: ExecuteJobActionInput) => {
    setIsSubmitting(true);
    try {
      const result = await executeJobAction(data);
      if (result.success) {
        toast({
          title: "Job executed",
          description: "Job execution has been recorded successfully.",
        });
        form.reset();
        onSuccess();
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

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execute Job</DialogTitle>
          <DialogDescription>
            Fill in the required information to complete this job execution
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {actionFields.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Action Fields</h4>
                <DynamicFieldRenderer
                  fields={actionFields.map((field) => ({
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Execution
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
