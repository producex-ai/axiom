"use client";

import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useActionState } from "react";
import {
  type ActionState,
  approveDailyLogAction,
  rejectDailyLogAction,
} from "@/actions/daily-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";

type ReviewerViewProps = {
  log: DailyLogWithDetails;
};

export function ReviewerView({ log }: ReviewerViewProps) {
  const [approveState, approveAction] = useActionState<ActionState, FormData>(
    approveDailyLogAction.bind(null, log.id),
    {},
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    rejectDailyLogAction.bind(null, log.id),
    {},
  );

  const totalTasks = Object.keys(log.tasks).length;
  const completedTasks = Object.values(log.tasks).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Task List - Read Only */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-sm">Task List</h3>
        <div className="mt-4 space-y-2">
          {Object.entries(log.tasks).length > 0 ? (
            Object.entries(log.tasks).map(([task, completed]) => (
              <div
                key={task}
                className={`flex items-center gap-3 rounded-md border p-3 ${
                  completed
                    ? "bg-muted/30"
                    : "border-orange-100 bg-orange-50/10"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    completed
                      ? "border-primary bg-primary"
                      : "border-orange-200 bg-white"
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-200" />
                  )}
                </div>
                <span
                  className={`flex-1 text-sm ${
                    completed
                      ? "text-muted-foreground line-through"
                      : "font-medium"
                  }`}
                >
                  {task}
                </span>
                {completed ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-green-100 bg-green-50 text-[10px] text-green-700"
                  >
                    Done
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 border-orange-100 bg-orange-50 text-[10px] text-orange-700"
                  >
                    Pending
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No tasks found in this log.
            </p>
          )}
        </div>

        <div className="mt-6 space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Submission Summary</h4>
              <p className="text-muted-foreground text-xs">
                {completedTasks} of {totalTasks} tasks completed
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
        </div>
      </div>

      {/* Review Actions */}
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
    </div>
  );
}
