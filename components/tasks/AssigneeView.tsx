"use client";

import { CheckCircle2 } from "lucide-react";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type ActionState,
  submitForApprovalAction,
  updateDailyLogTasksAction,
} from "@/actions/daily-logs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";

type AssigneeViewProps = {
  log: DailyLogWithDetails;
};

export function AssigneeView({ log }: AssigneeViewProps) {
  const [tasks, setTasks] = useState(log.tasks);
  const [showSignOff, setShowSignOff] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTasksRef = useRef<Record<string, boolean>>(log.tasks);

  const [updateState, updateAction] = useActionState<ActionState, FormData>(
    updateDailyLogTasksAction.bind(null, log.id),
    {},
  );
  const [submitState, submitAction] = useActionState<ActionState, FormData>(
    submitForApprovalAction.bind(null, log.id),
    {},
  );

  // Debounced save function
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveTasksToServer = (tasksToSave: Record<string, boolean>) => {
    const formData = new FormData();
    Object.entries(tasksToSave).forEach(([task, completed]) => {
      formData.append(`task_${task}`, completed.toString());
    });

    startTransition(() => {
      updateAction(formData);
      setIsSaving(false);
    });
  };

  const handleTaskChange = (taskName: string, checked: boolean) => {
    // Optimistically update UI immediately
    setTasks((prev) => {
      const updated = { ...prev, [taskName]: checked };
      pendingTasksRef.current = updated;
      return updated;
    });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set saving indicator
    setIsSaving(true);

    // Debounce the actual save operation (500ms)
    saveTimeoutRef.current = setTimeout(() => {
      saveTasksToServer(pendingTasksRef.current);
    }, 500);
  };

  const currentCompletedTasks = Object.values(tasks).filter(Boolean).length;
  const currentTotalTasks = Object.keys(tasks).length;
  const currentAllCompleted =
    currentTotalTasks > 0 && currentCompletedTasks === currentTotalTasks;

  return (
    <div className="space-y-4">
      {/* Rejected state message */}
      {log.status === "REJECTED" && log.reviewer_comment && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900 text-sm">
            Rejected by Reviewer
          </h3>
          <p className="mt-1 text-red-700 text-sm">{log.reviewer_comment}</p>
        </div>
      )}

      {/* Task List */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Task List</h3>
          {(isPending || isSaving) && (
            <span className="text-muted-foreground text-xs">Saving...</span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {Object.entries(tasks).map(([task, completed]) => (
            <div
              key={task}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Checkbox
                id={`task-${task}`}
                checked={completed}
                disabled={false}
                onCheckedChange={(checked) =>
                  handleTaskChange(task, checked === true)
                }
              />
              <Label
                htmlFor={`task-${task}`}
                className={`flex-1 cursor-pointer ${
                  completed ? "text-muted-foreground line-through" : ""
                }`}
              >
                {task}
              </Label>
            </div>
          ))}
        </div>

        {updateState.message && !isPending && (
          <p
            className={`mt-2 text-sm ${
              updateState.success ? "text-green-600" : "text-red-600"
            }`}
          >
            {updateState.message}
          </p>
        )}

        {currentAllCompleted && !showSignOff && (
          <div className="mt-4">
            <Button
              onClick={() => setShowSignOff(true)}
              variant="default"
              size="sm"
              disabled={isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Sign Off Tasks
            </Button>
          </div>
        )}
      </div>

      {/* Sign Off Section */}
      {showSignOff && currentAllCompleted && (
        <form action={submitAction} className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm">Task Sign Off</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            All tasks are completed. Please sign off and submit for review.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="assignee_comment">Comment (Optional)</Label>
              <Textarea
                id="assignee_comment"
                name="assignee_comment"
                placeholder="Add any notes or observations..."
                rows={3}
                className="mt-2"
                disabled={isPending}
              />
            </div>

            {submitState.message && (
              <p
                className={`text-sm ${
                  submitState.success ? "text-green-600" : "text-red-600"
                }`}
              >
                {submitState.message}
              </p>
            )}

            <div className="flex items-center justify-between">
              <Button
                type="button"
                onClick={() => setShowSignOff(false)}
                variant="ghost"
                size="sm"
                disabled={isPending}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  name="tasks_sign_off"
                  value="ACTION_REQUIRED"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                >
                  Action Required
                </Button>
                <Button
                  type="submit"
                  name="tasks_sign_off"
                  value="ALL_GOOD"
                  variant="default"
                  size="sm"
                  disabled={isPending}
                >
                  All Good
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
