"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  type CreateTemplateState,
  createLogTemplateAction,
} from "@/actions/log-templates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-fit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        "Create Template"
      )}
    </Button>
  );
}

export function CreateTemplateForm() {
  const initialState: CreateTemplateState = { message: "", errors: {} };
  const [state, formAction] = useActionState(
    createLogTemplateAction,
    initialState,
  );

  // State for dynamic task list visual management
  const [taskCount, setTaskCount] = useState<number>(1);
  const [taskIds, setTaskIds] = useState<number[]>([0]);

  const addTask = () => {
    const newId = taskIds.length > 0 ? Math.max(...taskIds) + 1 : 0;
    setTaskIds([...taskIds, newId]);
    setTaskCount(taskCount + 1);
  };

  const removeTask = (idToRemove: number) => {
    if (taskIds.length <= 1) return;
    setTaskIds(taskIds.filter((id) => id !== idToRemove));
    setTaskCount(taskCount - 1);
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* Top Row: Name, Category, SOP */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Opening Checklist"
                aria-describedby="name-error"
                required
              />
              {state.errors?.name && (
                <p id="name-error" className="text-destructive text-sm">
                  {state.errors.name.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="e.g., Daily Operations"
                aria-describedby="category-error"
                required
              />
              {state.errors?.category && (
                <p id="category-error" className="text-destructive text-sm">
                  {state.errors.category.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sop">Standard Operating Procedure (SOP)</Label>
              <Input
                id="sop"
                name="sop"
                placeholder="Detailed instructions link or short text..."
                aria-describedby="sop-error"
                required
              />
              {state.errors?.sop && (
                <p id="sop-error" className="text-destructive text-sm">
                  {state.errors.sop.join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Task List</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTask}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>

            <div className="space-y-3">
              {taskIds.map((id, index) => (
                <div key={id} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      name="tasks"
                      placeholder={`Task ${index + 1}`}
                      aria-label={`Task ${index + 1}`}
                      required // All tasks are required to not be empty
                    />
                  </div>
                  {taskIds.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTask(id)}
                      aria-label="Remove task"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  ) : (
                     <div className="w-10" /> // Spacer to keep alignment if needed, or just nothing.
                  )}
                </div>
              ))}
              {state.errors?.tasks && (
                <p className="text-destructive text-sm">
                  {state.errors.tasks.join(", ")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
