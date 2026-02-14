"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  approveDailyLog,
  type DailyLogWithDetails,
  getDailyLogById,
  getDailyLogs,
  getLogsForReview,
  getMyPendingLogs,
  rejectDailyLog,
  reopenDailyLog,
  submitDailyLogForApproval,
  updateDailyLogTasks,
} from "@/db/queries/daily-logs";
import type { FieldItem, TaskItem } from "@/db/queries/log-templates";

/**
 * Sort tasks in a log based on the original template items order
 */
function sortLogTasks(
  tasks: Record<string, boolean | string>,
  templateItems: TaskItem[] | FieldItem[] | null,
): Record<string, boolean | string> {
  if (!templateItems || templateItems.length === 0) return tasks;

  const sortedTasks: Record<string, boolean | string> = {};
  const taskNames = Object.keys(tasks);

  // First add tasks from template in their defined order
  for (const item of templateItems) {
    if (item.name in tasks) {
      sortedTasks[item.name] = tasks[item.name];
    }
  }

  // Then add any remaining tasks that might have been added manually or existed before
  for (const taskName of taskNames) {
    if (!(taskName in sortedTasks)) {
      sortedTasks[taskName] = tasks[taskName];
    }
  }

  return sortedTasks;
}

/**
 * Enrich daily logs with user names and process task ordering
 */
async function enrichLogsWithUserNames(
  logs: DailyLogWithDetails[],
): Promise<DailyLogWithDetails[]> {
  if (logs.length === 0) return logs;

  try {
    const client = await clerkClient();

    // Collect unique user IDs
    const userIds = new Set<string>();
    for (const log of logs) {
      if (log.assignee_id) userIds.add(log.assignee_id);
      if (log.reviewer_id) userIds.add(log.reviewer_id);
    }

    // Fetch user data from Clerk
    const userMap = new Map<string, string>();
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        try {
          const user = await client.users.getUser(userId);
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.emailAddresses[0]?.emailAddress ||
            "Unknown User";
          userMap.set(userId, name);
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          userMap.set(userId, "Unknown User");
        }
      }),
    );

    // Enrich logs with names and sort tasks
    return logs.map((log) => ({
      ...log,
      tasks: sortLogTasks(log.tasks, log.template_items),
      assignee_name: log.assignee_id
        ? userMap.get(log.assignee_id) || null
        : null,
      reviewer_name: log.reviewer_id
        ? userMap.get(log.reviewer_id) || null
        : null,
    }));
  } catch (error) {
    console.error("Error enriching logs:", error);
    return logs;
  }
}

// Validation schemas
const UpdateTasksSchema = z.object({
  tasks: z.record(z.string(), z.union([z.boolean(), z.string()])),
});

const SubmitForApprovalSchema = z.object({
  tasks_sign_off: z.enum(["ALL_GOOD", "ACTION_REQUIRED"]),
  assignee_comment: z.string().optional(),
});

const ReviewSchema = z.object({
  reviewer_comment: z.string().min(1, "Comment is required"),
});

export type ActionState = {
  message?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
};

/**
 * Get daily logs for the current user's organization
 */
export async function getDailyLogsAction(filters?: {
  status?: "PENDING" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  assigneeId?: string;
  reviewerId?: string;
  startDate?: string;
  endDate?: string;
  templateId?: string;
}): Promise<DailyLogWithDetails[]> {
  const { orgId } = await auth();
  if (!orgId) {
    return [];
  }

  const parsedFilters = {
    ...filters,
    startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
  };

  const logs = await getDailyLogs(orgId, parsedFilters);
  return enrichLogsWithUserNames(logs);
}

/**
 * Get a single daily log by ID
 */
export async function getDailyLogByIdAction(
  id: string,
): Promise<DailyLogWithDetails | null> {
  const { orgId } = await auth();
  if (!orgId) {
    return null;
  }

  const log = await getDailyLogById(id, orgId);
  if (!log) return null;

  const enriched = await enrichLogsWithUserNames([log]);
  return enriched[0] || null;
}

/**
 * Get pending logs assigned to current user
 */
export async function getMyPendingLogsAction(): Promise<DailyLogWithDetails[]> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return [];
  }

  const logs = await getMyPendingLogs(orgId, userId);
  return enrichLogsWithUserNames(logs);
}

/**
 * Get logs pending review for current user
 */
export async function getLogsForReviewAction(): Promise<DailyLogWithDetails[]> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return [];
  }

  const logs = await getLogsForReview(orgId, userId);
  return enrichLogsWithUserNames(logs);
}

/**
 * Update task completion status or field values
 */
export async function updateDailyLogTasksAction(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  // Parse tasks from form data
  const tasks: Record<string, boolean | string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("task_")) {
      const taskName = key.replace("task_", "");
      // Check if it's a checkbox (boolean) or text input (string)
      if (value === "true" || value === "false" || value === "on") {
        tasks[taskName] = value === "true" || value === "on";
      } else {
        tasks[taskName] = value.toString();
      }
    }
  }

  // Validate
  const validatedFields = UpdateTasksSchema.safeParse({ tasks });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid task data",
    };
  }

  try {
    const result = await updateDailyLogTasks(id, orgId, tasks);

    if (!result) {
      return {
        message: "Failed to update tasks. Log may not be in PENDING status.",
      };
    }

    // Only revalidate the specific log page, not the entire list
    // This reduces unnecessary data fetching
    revalidatePath(`/logs/daily/${id}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update tasks:", error);
    return { message: "Failed to update tasks. Please try again." };
  }
}

/**
 * Submit log for approval
 */
export async function submitForApprovalAction(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  const tasks_sign_off = formData.get("tasks_sign_off") as string;
  const assignee_comment = formData.get("assignee_comment") as string;

  // Validate
  const validatedFields = SubmitForApprovalSchema.safeParse({
    tasks_sign_off,
    assignee_comment,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please fix the errors below",
    };
  }

  try {
    // Fetch the log to check template type and validate required fields
    const log = await getDailyLogById(id, orgId);

    if (!log) {
      return { message: "Log not found" };
    }

    // Validate required fields for field_input templates
    if (log.template_type === "field_input") {
      const items = log.template_items as FieldItem[];
      const missingFields: string[] = [];

      for (const item of items) {
        if (item.required) {
          const value = log.tasks[item.name];
          if (!value || (typeof value === "string" && value.trim() === "")) {
            missingFields.push(item.name);
          }
        }
      }

      if (missingFields.length > 0) {
        return {
          message: `Please fill in all required fields: ${missingFields.join(", ")}`,
        };
      }
    }

    const result = await submitDailyLogForApproval(
      id,
      orgId,
      userId,
      validatedFields.data.tasks_sign_off as "ALL_GOOD" | "ACTION_REQUIRED",
      validatedFields.data.assignee_comment,
    );

    if (!result) {
      return {
        message:
          "Failed to submit log. Make sure all tasks are completed and you are the assignee.",
      };
    }

    revalidatePath("/logs/daily");
    revalidatePath(`/logs/daily/${id}`);

    return {
      success: true,
      message: "Log submitted for approval successfully",
    };
  } catch (error) {
    console.error("Failed to submit log:", error);
    return { message: "Failed to submit log. Please try again." };
  }
}

/**
 * Approve a daily log (reviewer action)
 */
export async function approveDailyLogAction(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  const reviewer_comment = formData.get("reviewer_comment") as string;

  try {
    const result = await approveDailyLog(id, orgId, userId, reviewer_comment);

    if (!result) {
      return {
        message:
          "Failed to approve log. Make sure you are the assigned reviewer and the log is pending approval.",
      };
    }

    revalidatePath("/logs/daily");
    revalidatePath(`/logs/daily/${id}`);
    revalidatePath("/logs/review");

    return { success: true, message: "Log approved successfully" };
  } catch (error) {
    console.error("Failed to approve log:", error);
    return { message: "Failed to approve log. Please try again." };
  }
}

/**
 * Reject a daily log (reviewer action)
 */
export async function rejectDailyLogAction(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  const reviewer_comment = formData.get("reviewer_comment") as string;

  // Validate
  const validatedFields = ReviewSchema.safeParse({ reviewer_comment });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please provide a reason for rejection",
    };
  }

  try {
    const result = await rejectDailyLog(
      id,
      orgId,
      userId,
      validatedFields.data.reviewer_comment,
    );

    if (!result) {
      return {
        message:
          "Failed to reject log. Make sure you are the assigned reviewer and the log is pending approval.",
      };
    }

    revalidatePath("/logs/daily");
    revalidatePath(`/logs/daily/${id}`);
    revalidatePath("/logs/review");

    return { success: true, message: "Log rejected successfully" };
  } catch (error) {
    console.error("Failed to reject log:", error);
    return { message: "Failed to reject log. Please try again." };
  }
}

/**
 * Reopen a rejected log (assignee action)
 */
export async function reopenDailyLogAction(id: string): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: "Unauthorized" };
  }

  try {
    const result = await reopenDailyLog(id, orgId, userId);

    if (!result) {
      return {
        message:
          "Failed to reopen log. Make sure you are the assignee and the log is rejected.",
      };
    }

    revalidatePath("/logs/daily");
    revalidatePath(`/logs/daily/${id}`);

    return { success: true, message: "Log reopened successfully" };
  } catch (error) {
    console.error("Failed to reopen log:", error);
    return { message: "Failed to reopen log. Please try again." };
  }
}
