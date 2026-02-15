"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  FieldItem,
  TaskItem,
  TemplateType,
} from "@/db/queries/log-templates";

type TaskViewProps = {
  mode: "edit" | "view";
  templateType: TemplateType;
  tasks: Record<string, boolean | string>;
  templateItems: TaskItem[] | FieldItem[];
  onChange?: (taskName: string, value: boolean | string) => void;
  isPending?: boolean;
  isSaving?: boolean;
};

export function TaskView({
  mode,
  templateType,
  tasks,
  templateItems,
  onChange,
  isPending = false,
  isSaving = false,
}: TaskViewProps) {
  const isFieldInputTemplate = templateType === "field_input";
  const fieldItems = isFieldInputTemplate ? (templateItems as FieldItem[]) : [];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {isFieldInputTemplate ? "Field List" : "Task List"}
        </h3>
        {(isPending || isSaving) && (
          <span className="text-muted-foreground text-xs">Saving...</span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {Object.entries(tasks).length > 0 ? (
          isFieldInputTemplate ? (
            // Field Input Mode
            fieldItems.map((field) => {
              const value = tasks[field.name];

              return (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={`field-${field.name}`}>
                    {field.name}
                    {field.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </Label>
                  {field.description && (
                    <p className="text-muted-foreground text-xs">
                      {field.description}
                    </p>
                  )}
                  <Input
                    id={`field-${field.name}`}
                    value={(value as string) || ""}
                    onChange={(e) => onChange?.(field.name, e.target.value)}
                    placeholder={field.description || `Enter ${field.name}`}
                    required={field.required}
                    disabled={mode === "view"}
                  />
                </div>
              );
            })
          ) : (
            // Task List Mode
            Object.entries(tasks).map(([task, completed]) => {
              return (
                <div
                  key={task}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={`task-${task}`}
                    checked={completed as boolean}
                    onCheckedChange={(checked) =>
                      onChange?.(task, checked === true)
                    }
                    disabled={mode === "view"}
                  />
                  <Label
                    htmlFor={`task-${task}`}
                    className={`flex-1 ${mode === "edit" ? "cursor-pointer" : ""} ${
                      completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {task}
                  </Label>
                </div>
              );
            })
          )
        ) : (
          <p className="py-4 text-center text-muted-foreground text-sm">
            No {isFieldInputTemplate ? "fields" : "tasks"} found in this log.
          </p>
        )}
      </div>
    </div>
  );
}
