import type { TemplateType } from "@/db/queries/log-templates";

/**
 * Calculate the number of completed tasks/fields based on template type
 * - For task_list: counts boolean true values
 * - For field_input: counts non-empty string values
 */
export function getCompletedTasksCount(
  tasks: Record<string, boolean | string>,
  templateType: TemplateType,
): number {
  if (templateType === "field_input") {
    return Object.values(tasks).filter(
      (value) => typeof value === "string" && value.trim() !== "",
    ).length;
  } else {
    return Object.values(tasks).filter(Boolean).length;
  }
}

/**
 * Get the total number of tasks/fields
 */
export function getTotalTasksCount(
  tasks: Record<string, boolean | string>,
): number {
  return Object.keys(tasks).length;
}

/**
 * Calculate completion percentage (0-100)
 */
export function getCompletionPercentage(
  tasks: Record<string, boolean | string>,
  templateType: TemplateType,
): number {
  const total = getTotalTasksCount(tasks);
  if (total === 0) return 0;

  const completed = getCompletedTasksCount(tasks, templateType);
  return (completed / total) * 100;
}
