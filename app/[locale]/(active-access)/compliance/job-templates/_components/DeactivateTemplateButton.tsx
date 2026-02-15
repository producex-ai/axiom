"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteJobTemplate } from "@/lib/actions/jobTemplateActions";
import { useToast } from "@/hooks/use-toast";

interface DeactivateTemplateButtonProps {
  templateId: string;
  templateName: string;
  jobCount: number;
}

export function DeactivateTemplateButton({
  templateId,
  templateName,
  jobCount,
}: DeactivateTemplateButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const hasJobs = jobCount > 0;

  const handleDeactivate = async () => {
    if (hasJobs) {
      toast({
        title: "Cannot deactivate",
        description: "This template has active jobs. Please delete all jobs before deactivating the template.",
        variant: "destructive",
      });
      return;
    }

    setIsDeactivating(true);
    try {
      const result = await deleteJobTemplate(templateId);
      if (result.success) {
        toast({
          title: "Template deactivated",
          description: "Template has been deactivated successfully.",
        });
        router.push("/compliance/job-templates");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to deactivate template",
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
      setIsDeactivating(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={hasJobs}
          className={hasJobs ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Ban className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate Template</AlertDialogTitle>
          <AlertDialogDescription>
            {hasJobs ? (
              <span className="text-destructive font-medium">
                This template has {jobCount} active job{jobCount !== 1 ? 's' : ''} and cannot be deactivated.
                Please delete all jobs before deactivating the template.
              </span>
            ) : (
              <>
                Are you sure you want to deactivate "{templateName}"? This action will
                archive the template and it will no longer appear in your list.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
          {!hasJobs && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeactivate();
              }}
              disabled={isDeactivating}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deactivate Template
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
