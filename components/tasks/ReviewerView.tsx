"use client";

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useActionState } from "react";

import {
  type ActionState,
  approveDailyLogAction,
  rejectDailyLogAction,
} from "@/actions/daily-logs";
import { TaskView } from "@/components/tasks/TaskView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";
import {
  getCompletedTasksCount,
  getTotalTasksCount,
} from "@/lib/utils/task-utils";

type ReviewerViewProps = {
  log: DailyLogWithDetails;
  mode?: "edit" | "view";
};

export function ReviewerView({ log, mode = "edit" }: ReviewerViewProps) {
  const [approveState, approveAction] = useActionState<ActionState, FormData>(
    approveDailyLogAction.bind(null, log.id),
    {},
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    rejectDailyLogAction.bind(null, log.id),
    {},
  );

  const isFieldInputTemplate = log.template_type === "field_input";
  const totalTasks = getTotalTasksCount(log.tasks);
  const completedTasks = getCompletedTasksCount(log.tasks, log.template_type);

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
      <div className="rounded-lg border bg-card p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Submission Summary</h4>
              <p className="text-muted-foreground text-xs">
                {completedTasks} of {totalTasks}{" "}
                {isFieldInputTemplate ? "fields filled" : "tasks completed"}
              </p>
            </div>
            {log.tasks_sign_off && (
              <Badge
                variant={
                  log.tasks_sign_off === "ALL_GOOD" ? "success" : "destructive"
                }
                className="px-2"
              >
                {log.tasks_sign_off === "ALL_GOOD" ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    All Good
                  </>
                ) : (
                  <>
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Action Required
                  </>
                )}
              </Badge>
            )}
          </div>

          {log.assignee_comment && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Assignee Comment
              </p>
              <p className="text-foreground text-sm italic leading-relaxed">
                "{log.assignee_comment}"
              </p>
            </div>
          )}

          {log.reviewer_comment && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Reviewer Comment
              </p>
              <p className="text-foreground text-sm italic leading-relaxed">
                "{log.reviewer_comment}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Review Actions - only in edit mode */}
      {mode === "edit" && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm">Review</h3>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="reviewer_comment">Comment</Label>
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

            {(approveState.message || rejectState.message) && (
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
    </div>
  );
}
