"use client";

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
import { ReviewSummary } from "@/components/tasks/ReviewSummary";
import { SubmissionSummary } from "@/components/tasks/SubmissionSummary";
import { TaskView } from "@/components/tasks/TaskView";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";
import type { FieldItem } from "@/db/queries/log-templates";
import {
  getCompletedTasksCount,
  getTotalTasksCount,
} from "@/lib/utils/task-utils";

type AssigneeViewProps = {
  log: DailyLogWithDetails;
  mode?: "edit" | "view";
};

export function AssigneeView({ log, mode = "edit" }: AssigneeViewProps) {
  const [tasks, setTasks] = useState(log.tasks);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTasksRef = useRef<Record<string, boolean | string>>(log.tasks);

  const isFieldInputTemplate = log.template_type === "field_input";
  const fieldItems = isFieldInputTemplate
    ? (log.template_items as FieldItem[])
    : [];

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

  const saveTasksToServer = (tasksToSave: Record<string, boolean | string>) => {
    const formData = new FormData();
    Object.entries(tasksToSave).forEach(([task, value]) => {
      formData.append(`task_${task}`, value.toString());
    });

    startTransition(() => {
      updateAction(formData);
      setIsSaving(false);
    });
  };

  const handleTaskChange = (taskName: string, value: boolean | string) => {
    // Optimistically update UI immediately
    setTasks((prev) => {
      const updated = { ...prev, [taskName]: value };
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

  // Check if all requirements are met for sign-off
  const isReadyForSignOff = () => {
    if (isFieldInputTemplate) {
      // For field input templates, check that all required fields have values
      return fieldItems.every((field) => {
        if (!field.required) return true;
        const value = tasks[field.name];
        return value && (typeof value !== "string" || value.trim() !== "");
      });
    } else {
      // For task list templates, check that all tasks are completed
      const completedTasks = getCompletedTasksCount(tasks, log.template_type);
      const totalTasks = getTotalTasksCount(tasks);
      return totalTasks > 0 && completedTasks === totalTasks;
    }
  };

  const currentAllCompleted = isReadyForSignOff();

  // View mode: Show read-only view with submission summary
  if (mode === "view") {
    return (
      <div className="space-y-4">
        <TaskView
          mode="view"
          templateType={log.template_type}
          tasks={log.tasks}
          templateItems={log.template_items}
        />

        <SubmissionSummary log={log} />
        <ReviewSummary log={log} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Review Summary for Approved/Rejected statuses */}
      <ReviewSummary log={log} />

      {/* Task/Field List */}
      <TaskView
        mode="edit"
        templateType={log.template_type}
        tasks={tasks}
        templateItems={log.template_items}
        onChange={handleTaskChange}
        isPending={isPending}
        isSaving={isSaving}
      />

      {updateState.message && !isPending && (
        <div className="rounded-lg border bg-card p-4">
          <p
            className={`text-sm ${
              updateState.success ? "text-green-600" : "text-red-600"
            }`}
          >
            {updateState.message}
          </p>
        </div>
      )}

      {/* Sign Off Section */}

      <form action={submitAction} className="rounded-lg border bg-card p-4">
        <h3 className="font-semibold text-sm">
          {isFieldInputTemplate ? "Field Sign Off" : "Task Sign Off"}
        </h3>
        <p className="mt-1 text-muted-foreground text-sm">
          {isFieldInputTemplate
            ? "All required fields are filled. Please sign off and submit for review."
            : "All tasks are completed. Please sign off and submit for review."}
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
            <p />
            <div className="flex gap-2">
              <Button
                type="submit"
                name="tasks_sign_off"
                value="ACTION_REQUIRED"
                variant="outline"
                size="sm"
                disabled={isPending || !currentAllCompleted}
              >
                {isPending ? "Saving.." : "Action Required"}
              </Button>
              <Button
                type="submit"
                name="tasks_sign_off"
                value="ALL_GOOD"
                variant="default"
                size="sm"
                disabled={isPending || !currentAllCompleted}
              >
                {isPending ? "Saving.." : "All Good"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
