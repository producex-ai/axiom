'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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
} from '@/db/queries/daily-logs';

// Validation schemas
const UpdateTasksSchema = z.object({
  tasks: z.record(z.string(), z.boolean()),
});

const SubmitForApprovalSchema = z.object({
  tasks_sign_off: z.enum(['ALL_GOOD', 'ACTION_REQUIRED']),
  assignee_comment: z.string().optional(),
});

const ReviewSchema = z.object({
  reviewer_comment: z.string().min(1, 'Comment is required'),
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
  status?: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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

  return getDailyLogs(orgId, parsedFilters);
}

/**
 * Get a single daily log by ID
 */
export async function getDailyLogByIdAction(
  id: string
): Promise<DailyLogWithDetails | null> {
  const { orgId } = await auth();
  if (!orgId) {
    return null;
  }

  return getDailyLogById(id, orgId);
}

/**
 * Get pending logs assigned to current user
 */
export async function getMyPendingLogsAction(): Promise<DailyLogWithDetails[]> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return [];
  }

  return getMyPendingLogs(orgId, userId);
}

/**
 * Get logs pending review for current user
 */
export async function getLogsForReviewAction(): Promise<DailyLogWithDetails[]> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return [];
  }

  return getLogsForReview(orgId, userId);
}

/**
 * Update task completion status
 */
export async function updateDailyLogTasksAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: 'Unauthorized' };
  }

  // Parse tasks from form data
  const tasks: Record<string, boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('task_')) {
      const taskName = key.replace('task_', '');
      tasks[taskName] = value === 'true' || value === 'on';
    }
  }

  // Validate
  const validatedFields = UpdateTasksSchema.safeParse({ tasks });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid task data',
    };
  }

  try {
    const result = await updateDailyLogTasks(id, orgId, tasks);

    if (!result) {
      return {
        message: 'Failed to update tasks. Log may not be in PENDING status.',
      };
    }

    revalidatePath('/logs/daily');
    revalidatePath(`/logs/daily/${id}`);

    return { success: true, message: 'Tasks updated successfully' };
  } catch (error) {
    console.error('Failed to update tasks:', error);
    return { message: 'Failed to update tasks. Please try again.' };
  }
}

/**
 * Submit log for approval
 */
export async function submitForApprovalAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: 'Unauthorized' };
  }

  const tasks_sign_off = formData.get('tasks_sign_off') as string;
  const assignee_comment = formData.get('assignee_comment') as string;

  // Validate
  const validatedFields = SubmitForApprovalSchema.safeParse({
    tasks_sign_off,
    assignee_comment,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Please fix the errors below',
    };
  }

  try {
    const result = await submitDailyLogForApproval(
      id,
      orgId,
      userId,
      validatedFields.data.tasks_sign_off as 'ALL_GOOD' | 'ACTION_REQUIRED',
      validatedFields.data.assignee_comment
    );

    if (!result) {
      return {
        message:
          'Failed to submit log. Make sure all tasks are completed and you are the assignee.',
      };
    }

    revalidatePath('/logs/daily');
    revalidatePath(`/logs/daily/${id}`);

    return {
      success: true,
      message: 'Log submitted for approval successfully',
    };
  } catch (error) {
    console.error('Failed to submit log:', error);
    return { message: 'Failed to submit log. Please try again.' };
  }
}

/**
 * Approve a daily log (reviewer action)
 */
export async function approveDailyLogAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: 'Unauthorized' };
  }

  const reviewer_comment = formData.get('reviewer_comment') as string;

  try {
    const result = await approveDailyLog(id, orgId, userId, reviewer_comment);

    if (!result) {
      return {
        message:
          'Failed to approve log. Make sure you are the assigned reviewer and the log is pending approval.',
      };
    }

    revalidatePath('/logs/daily');
    revalidatePath(`/logs/daily/${id}`);
    revalidatePath('/logs/review');

    return { success: true, message: 'Log approved successfully' };
  } catch (error) {
    console.error('Failed to approve log:', error);
    return { message: 'Failed to approve log. Please try again.' };
  }
}

/**
 * Reject a daily log (reviewer action)
 */
export async function rejectDailyLogAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: 'Unauthorized' };
  }

  const reviewer_comment = formData.get('reviewer_comment') as string;

  // Validate
  const validatedFields = ReviewSchema.safeParse({ reviewer_comment });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Please provide a reason for rejection',
    };
  }

  try {
    const result = await rejectDailyLog(
      id,
      orgId,
      userId,
      validatedFields.data.reviewer_comment
    );

    if (!result) {
      return {
        message:
          'Failed to reject log. Make sure you are the assigned reviewer and the log is pending approval.',
      };
    }

    revalidatePath('/logs/daily');
    revalidatePath(`/logs/daily/${id}`);
    revalidatePath('/logs/review');

    return { success: true, message: 'Log rejected successfully' };
  } catch (error) {
    console.error('Failed to reject log:', error);
    return { message: 'Failed to reject log. Please try again.' };
  }
}

/**
 * Reopen a rejected log (assignee action)
 */
export async function reopenDailyLogAction(id: string): Promise<ActionState> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return { message: 'Unauthorized' };
  }

  try {
    const result = await reopenDailyLog(id, orgId, userId);

    if (!result) {
      return {
        message:
          'Failed to reopen log. Make sure you are the assignee and the log is rejected.',
      };
    }

    revalidatePath('/logs/daily');
    revalidatePath(`/logs/daily/${id}`);

    return { success: true, message: 'Log reopened successfully' };
  } catch (error) {
    console.error('Failed to reopen log:', error);
    return { message: 'Failed to reopen log. Please try again.' };
  }
}
