import { query } from "@/lib/db/postgres";

export type DailyLog = {
  id: string;
  org_id: string;
  template_id: string;
  schedule_id: string;
  assignee_id: string;
  reviewer_id: string | null;
  tasks: Record<string, boolean>; // Task name -> completion status
  tasks_sign_off: "ALL_GOOD" | "ACTION_REQUIRED" | null;
  assignee_comment: string | null;
  reviewer_comment: string | null;
  status: "PENDING" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  log_date: Date;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
};

export type DailyLogWithDetails = DailyLog & {
  template_name: string;
  template_category: string | null;
  template_sop: string | null;
  template_tasks: string[] | null;
  assignee_name: string | null;
  reviewer_name: string | null;
};

export type CreateDailyLogInput = {
  org_id: string;
  template_id: string;
  schedule_id: string;
  assignee_id: string;
  reviewer_id: string | null;
  tasks: Record<string, boolean>;
  log_date: Date;
  created_by: string;
};

/**
 * Create a new daily log from a schedule
 */
export const createDailyLog = async (
  input: CreateDailyLogInput,
): Promise<DailyLog | null> => {
  try {
    const result = await query<DailyLog>(
      `
      INSERT INTO daily_logs (
        org_id, 
        template_id, 
        schedule_id, 
        assignee_id, 
        reviewer_id, 
        tasks, 
        log_date, 
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        input.org_id,
        input.template_id,
        input.schedule_id,
        input.assignee_id,
        input.reviewer_id,
        JSON.stringify(input.tasks),
        input.log_date,
        input.created_by,
      ],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating daily log:", error);
    return null;
  }
};

/**
 * Update task completion status
 */
export const updateDailyLogTasks = async (
  id: string,
  orgId: string,
  tasks: Record<string, boolean>,
): Promise<DailyLog | null> => {
  try {
    const result = await query<DailyLog>(
      `
      UPDATE daily_logs
      SET 
        tasks = $1,
        updated_at = NOW()
      WHERE id = $2 AND org_id = $3 AND status IN ('PENDING', 'REJECTED')
      RETURNING *
      `,
      [JSON.stringify(tasks), id, orgId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error updating daily log tasks:", error);
    return null;
  }
};

/**
 * Submit log for approval (assignee completes and sends for review)
 */
export const submitDailyLogForApproval = async (
  id: string,
  orgId: string,
  assigneeId: string,
  tasksSignOff: "ALL_GOOD" | "ACTION_REQUIRED",
  assigneeComment?: string,
): Promise<DailyLog | null> => {
  try {
    const result = await query<DailyLog>(
      `
      UPDATE daily_logs
      SET 
        status = 'PENDING_APPROVAL',
        tasks_sign_off = $1,
        assignee_comment = $2,
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = $3 AND org_id = $4 AND assignee_id = $5 AND status IN ('PENDING', 'REJECTED')
      RETURNING *
      `,
      [tasksSignOff, assigneeComment || null, id, orgId, assigneeId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error submitting daily log for approval:", error);
    return null;
  }
};

/**
 * Approve a daily log (reviewer action)
 */
export const approveDailyLog = async (
  id: string,
  orgId: string,
  reviewerId: string,
  reviewerComment?: string,
): Promise<DailyLog | null> => {
  try {
    const result = await query<DailyLog>(
      `
      UPDATE daily_logs
      SET 
        status = 'APPROVED',
        reviewer_comment = $1,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND org_id = $3 AND reviewer_id = $4 AND status = 'PENDING_APPROVAL'
      RETURNING *
      `,
      [reviewerComment || null, id, orgId, reviewerId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error approving daily log:", error);
    return null;
  }
};

/**
 * Reject a daily log and send back to assignee (reviewer action)
 */
export const rejectDailyLog = async (
  id: string,
  orgId: string,
  reviewerId: string,
  reviewerComment: string,
): Promise<DailyLog | null> => {
  try {
    const result = await query<DailyLog>(
      `
      UPDATE daily_logs
      SET 
        status = 'REJECTED',
        reviewer_comment = $1,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND org_id = $3 AND reviewer_id = $4 AND status = 'PENDING_APPROVAL'
      RETURNING *
      `,
      [reviewerComment, id, orgId, reviewerId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error rejecting daily log:", error);
    return null;
  }
};

/**
 * Reopen a rejected log for assignee to fix (change status back to PENDING)
 */
export const reopenDailyLog = async (
  id: string,
  orgId: string,
  assigneeId: string,
): Promise<DailyLog | null> => {
  try {
    const result = await query<DailyLog>(
      `
      UPDATE daily_logs
      SET 
        status = 'PENDING',
        tasks_sign_off = NULL,
        submitted_at = NULL,
        reviewed_at = NULL,
        updated_at = NOW()
      WHERE id = $1 AND org_id = $2 AND assignee_id = $3 AND status = 'REJECTED'
      RETURNING *
      `,
      [id, orgId, assigneeId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error reopening daily log:", error);
    return null;
  }
};

/**
 * Get daily logs for an organization with optional filters
 */
export const getDailyLogs = async (
  orgId: string,
  filters?: {
    status?: DailyLog["status"];
    assigneeId?: string;
    reviewerId?: string;
    startDate?: Date;
    endDate?: Date;
    templateId?: string;
  },
): Promise<DailyLogWithDetails[]> => {
  try {
    let queryText = `
      SELECT 
        dl.*,
        lt.name as template_name,
        lt.category as template_category,
        lt.sop as template_sop,
        lt.task_list as template_tasks
      FROM daily_logs dl
      JOIN log_templates lt ON dl.template_id = lt.id
      WHERE dl.org_id = $1
    `;

    const params: (string | Date)[] = [orgId];
    let paramIndex = 2;

    if (filters?.status) {
      queryText += ` AND dl.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.assigneeId) {
      queryText += ` AND dl.assignee_id = $${paramIndex}`;
      params.push(filters.assigneeId);
      paramIndex++;
    }

    if (filters?.reviewerId) {
      queryText += ` AND dl.reviewer_id = $${paramIndex}`;
      params.push(filters.reviewerId);
      paramIndex++;
    }

    if (filters?.startDate) {
      queryText += ` AND dl.log_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      queryText += ` AND dl.log_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters?.templateId) {
      queryText += ` AND dl.template_id = $${paramIndex}`;
      params.push(filters.templateId);
      paramIndex++;
    }

    queryText += ` ORDER BY dl.log_date DESC, dl.created_at DESC`;

    const result = await query<DailyLogWithDetails>(queryText, params);
    return result.rows;
  } catch (error) {
    console.error("Error fetching daily logs:", error);
    return [];
  }
};

/**
 * Get a single daily log by ID
 */
export const getDailyLogById = async (
  id: string,
  orgId: string,
): Promise<DailyLogWithDetails | null> => {
  try {
    const result = await query<DailyLogWithDetails>(
      `
      SELECT 
        dl.*,
        lt.name as template_name,
        lt.category as template_category,
        lt.sop as template_sop,
        lt.task_list as template_tasks
      FROM daily_logs dl
      JOIN log_templates lt ON dl.template_id = lt.id
      WHERE dl.id = $1 AND dl.org_id = $2
      `,
      [id, orgId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching daily log:", error);
    return null;
  }
};

/**
 * Get pending logs for an assignee
 */
export const getMyPendingLogs = async (
  orgId: string,
  assigneeId: string,
): Promise<DailyLogWithDetails[]> => {
  return getDailyLogs(orgId, {
    assigneeId,
    status: "PENDING",
  });
};

/**
 * Get logs pending review for a reviewer
 */
export const getLogsForReview = async (
  orgId: string,
  reviewerId: string,
): Promise<DailyLogWithDetails[]> => {
  return getDailyLogs(orgId, {
    reviewerId,
    status: "PENDING_APPROVAL",
  });
};

/**
 * Check if a log already exists for a schedule and date
 */
export const checkDailyLogExists = async (
  scheduleId: string,
  logDate: Date,
): Promise<boolean> => {
  try {
    const result = await query(
      `
      SELECT 1
      FROM daily_logs
      WHERE schedule_id = $1 AND log_date = $2
      LIMIT 1
      `,
      [scheduleId, logDate],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error checking daily log existence:", error);
    return false;
  }
};

/**
 * Count existing logs for a schedule and date
 */
export const countDailyLogs = async (
  scheduleId: string,
  logDate: Date,
): Promise<number> => {
  try {
    const result = await query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM daily_logs
      WHERE schedule_id = $1 AND log_date = $2
      `,
      [scheduleId, logDate],
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  } catch (error) {
    console.error("Error counting daily logs:", error);
    return 0;
  }
};

/**
 * Get task completion statistics for a date range
 */
export const getDailyLogStats = async (
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  total: number;
  pending: number;
  pending_approval: number;
  approved: number;
  rejected: number;
  completion_rate: number;
}> => {
  try {
    const result = await query<{
      total: string;
      pending: string;
      pending_approval: string;
      approved: string;
      rejected: string;
    }>(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL') as pending_approval,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM daily_logs
      WHERE org_id = $1 AND log_date BETWEEN $2 AND $3
      `,
      [orgId, startDate, endDate],
    );

    const row = result.rows[0];
    const total = parseInt(row?.total || "0");
    const approved = parseInt(row?.approved || "0");
    const completion_rate = total > 0 ? (approved / total) * 100 : 0;

    return {
      total,
      pending: parseInt(row?.pending || "0"),
      pending_approval: parseInt(row?.pending_approval || "0"),
      approved,
      rejected: parseInt(row?.rejected || "0"),
      completion_rate,
    };
  } catch (error) {
    console.error("Error fetching daily log stats:", error);
    return {
      total: 0,
      pending: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      completion_rate: 0,
    };
  }
};
