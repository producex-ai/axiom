"use client";

import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  type ActionState,
  approveDailyLogAction,
  markDailyLogObsoleteAction,
  rejectDailyLogAction,
} from "@/actions/daily-logs";
import { ReviewSummary } from "@/components/tasks/ReviewSummary";
import { SubmissionSummary } from "@/components/tasks/SubmissionSummary";
import { TaskView } from "@/components/tasks/TaskView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";
import { getCompletedTasksCount } from "@/lib/utils/task-utils";

type ReviewerViewProps = {
  log: DailyLogWithDetails;
  mode?: "edit" | "view";
};

export function ReviewerView({ log, mode = "edit" }: ReviewerViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showObsoleteDialog, setShowObsoleteDialog] = useState(false);
  const [obsoleteError, setObsoleteError] = useState<string | null>(null);

  const [approveState, approveAction] = useActionState<ActionState, FormData>(
    approveDailyLogAction.bind(null, log.id),
    {},
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    rejectDailyLogAction.bind(null, log.id),
    {},
  );

  const completedTasks = getCompletedTasksCount(log.tasks, log.template_type);

  // Can mark as obsolete if status is PENDING and no tasks have been completed
  const canMarkObsolete = log.status === "PENDING" && completedTasks === 0;

  const handleMarkObsolete = async () => {
    setObsoleteError(null);
    startTransition(async () => {
      const result = await markDailyLogObsoleteAction(log.id);
      if (result.success) {
        setShowObsoleteDialog(false);
        router.push("/tasks");
        router.refresh();
      } else {
        setObsoleteError(result.message || "Failed to mark as obsolete");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Task/Field List - Read Only */}
      <TaskView
        mode="view"
        templateType={log.template_type}
        tasks={log.tasks}
        templateItems={log.template_items}
      />

      {/* Summary and Comments Section */}
      <SubmissionSummary log={log} />

      {/* Review Summary */}
      <ReviewSummary log={log} />

      {/* Mark as Obsolete - Available when status is PENDING */}
      {canMarkObsolete && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/30 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-semibold text-orange-900 text-sm">
                Incorrect Scheduling?
              </h4>
              <p className="text-muted-foreground text-xs">
                If this task was created by mistake, you can mark it as obsolete
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowObsoleteDialog(true)}
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Mark as Obsolete
            </Button>
          </div>
        </div>
      )}

      {/* Review Actions - only in edit mode */}
      {mode === "edit" && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm">Review</h3>
          <div className="mt-4 space-y-4">
            <div>
              <Textarea
                id="reviewer_comment"
                name="reviewer_comment"
                placeholder="Add your review comments..."
                rows={3}
                className="mt-2"
              />
              <p className="mt-1 text-muted-foreground text-xs">
                Required for rejection, optional for approval
              </p>
            </div>

            {(approveState.message || rejectState.message) &&
              !rejectState.errors?.reviewer_comment && (
                <p
                  className={`text-sm ${
                    approveState.success || rejectState.success
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {approveState.message || rejectState.message}
                </p>
              )}
            {rejectState.errors?.reviewer_comment && (
              <p className="text-red-600 text-sm">
                {rejectState.errors.reviewer_comment[0]}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <form action={rejectAction}>
                <Textarea
                  name="reviewer_comment"
                  className="hidden"
                  value=""
                  readOnly
                />
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    const textarea = document.getElementById(
                      "reviewer_comment",
                    ) as HTMLTextAreaElement;
                    const form = e.currentTarget.closest("form");
                    if (form && textarea) {
                      const hiddenTextarea = form.querySelector(
                        'textarea[name="reviewer_comment"]',
                      ) as HTMLTextAreaElement;
                      if (hiddenTextarea) {
                        hiddenTextarea.value = textarea.value;
                      }
                    }
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </form>

              <form action={approveAction}>
                <Textarea
                  name="reviewer_comment"
                  className="hidden"
                  value=""
                  readOnly
                />
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    const textarea = document.getElementById(
                      "reviewer_comment",
                    ) as HTMLTextAreaElement;
                    const form = e.currentTarget.closest("form");
                    if (form && textarea) {
                      const hiddenTextarea = form.querySelector(
                        'textarea[name="reviewer_comment"]',
                      ) as HTMLTextAreaElement;
                      if (hiddenTextarea) {
                        hiddenTextarea.value = textarea.value;
                      }
                    }
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Obsolete Confirmation Dialog */}
      <AlertDialog
        open={showObsoleteDialog}
        onOpenChange={setShowObsoleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Task as Obsolete?</AlertDialogTitle>
            <AlertDialogDescription>
              This task was created due to incorrect scheduling. Marking it as
              obsolete will remove it from active tasks but keep it in the
              history for audit purposes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {obsoleteError && (
            <p className="text-red-600 text-sm">{obsoleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkObsolete}
              disabled={isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isPending ? "Marking..." : "Mark as Obsolete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
