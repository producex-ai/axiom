import { getPool } from "@/lib/db/postgres";
import { getUserDisplayNames } from "@/lib/services/userService";
import type { ScheduleFrequency } from "@/lib/cron/cron-utils";
import type {
  CreateJobInput,
  UpdateJobInput,
  ExecuteJobActionInput,
  JobStatus,
} from "@/lib/validators/jobValidators";
import type { JobTemplateField } from "./jobTemplateService";

export interface Job {
  id: string;
  template_id: string;
  template_version: number;
  title: string;
  assigned_to: string;
  frequency: ScheduleFrequency;
  next_execution_date: string;
  last_execution_date: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface JobWithTemplate extends Job {
  template_name: string;
  template_category: string;
  template_description: string | null;
}

export interface JobCreationValue {
  id: string;
  job_id: string;
  field_key: string;
  value_json: any;
}

export interface JobAction {
  id: string;
  job_id: string;
  performed_by: string;
  performed_at: Date;
  notes: string | null;
}

export interface JobActionValue {
  id: string;
  action_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  value_json: any;
}

export interface ExecutionHistoryItem {
  id: string;
  performed_by: string;
  performed_by_name: string; // User display name
  performed_at: Date;
  notes: string | null;
  action_values: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    value: any;
  }>;
}

export interface JobDetail {
  job: JobWithTemplate & { assigned_to_name: string };
  template: {
    name: string;
    category: string;
    description: string | null;
  };
  creation_fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    value: any;
    is_required: boolean;
    config: Record<string, any>;
  }>;
  action_fields: Array<{
    field_key: string;
    field_label: string;
    field_type: string;
    is_required: boolean;
    config: Record<string, any>;
  }>;
  execution_history: ExecutionHistoryItem[];
  derived_status: JobStatus;
}

/**
 * Derive job status based on cycle-window execution logic
 * 
 * Uses the new cycle-window utilities for clean, testable logic.
 * The cycle window is derived from next_execution_date (the cycle boundary).
 */
export function deriveStatus(job: Job): JobStatus {
  const nextExecutionDate = new Date(job.next_execution_date);
  const lastExecutionDate = job.last_execution_date ? new Date(job.last_execution_date) : null;
  
  // Import the utility function inline to avoid circular dependencies
  const { deriveJobStatus } = require("@/lib/utils/job-cycle-utils");
  
  return deriveJobStatus(lastExecutionDate, nextExecutionDate, job.frequency);
}

/**
 * Create a new job from template
 */
export async function createJob(
  input: CreateJobInput,
  userId: string
): Promise<Job> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get template version
    const templateResult = await pool.query(
      `SELECT version FROM job_templates WHERE id = $1`,
      [input.template_id]
    );

    if (templateResult.rows.length === 0) {
      throw new Error("Template not found");
    }

    const templateVersion = templateResult.rows[0].version;

    // Convert date if string
    const nextExecutionDate =
      typeof input.next_execution_date === "string"
        ? input.next_execution_date
        : input.next_execution_date.toISOString().split("T")[0];

    // Insert job
    const jobResult = await client.query<Job>(
      `INSERT INTO jobs 
       (template_id, template_version, title, assigned_to, frequency, next_execution_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.template_id,
        templateVersion,
        input.title,
        input.assigned_to,
        input.frequency,
        nextExecutionDate,
        userId,
      ]
    );

    const job = jobResult.rows[0];

    // Insert creation field values
    for (const [fieldKey, value] of Object.entries(
      input.creation_field_values
    )) {
      await client.query(
        `INSERT INTO job_creation_values (job_id, field_key, value_json)
         VALUES ($1, $2, $3)`,
        [job.id, fieldKey, JSON.stringify(value)]
      );
    }

    await client.query("COMMIT");

    return job;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all jobs with template info
 */
export async function getJobs(
  userId: string,
  filters?: {
    assigned_to?: string;
    template_id?: string;
  }
): Promise<JobWithTemplate[]> {
  const pool = getPool();

  let query = `
    SELECT 
      j.*,
      t.name as template_name,
      t.category as template_category,
      t.description as template_description
    FROM jobs j
    INNER JOIN job_templates t ON j.template_id = t.id
    WHERE j.created_by = $1
  `;

  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters?.assigned_to) {
    query += ` AND j.assigned_to = $${paramIndex++}`;
    params.push(filters.assigned_to);
  }

  if (filters?.template_id) {
    query += ` AND j.template_id = $${paramIndex++}`;
    params.push(filters.template_id);
  }

  query += ` ORDER BY j.next_execution_date ASC`;

  const result = await pool.query<JobWithTemplate>(query, params);

  return result.rows;
}

/**
 * Get job by ID with full details
 */
export async function getJobById(
  jobId: string,
  userId: string
): Promise<JobDetail | null> {
  const pool = getPool();

  // Get job with template
  const jobResult = await pool.query<JobWithTemplate>(
    `SELECT 
       j.*,
       t.name as template_name,
       t.category as template_category,
       t.description as template_description
     FROM jobs j
     INNER JOIN job_templates t ON j.template_id = t.id
     WHERE j.id = $1 AND j.created_by = $2`,
    [jobId, userId]
  );

  if (jobResult.rows.length === 0) {
    return null;
  }

  const job = jobResult.rows[0];

  // Get creation field values
  const creationFieldsResult = await pool.query(
    `SELECT 
       f.field_key,
       f.field_label,
       f.field_type,
       f.is_required,
       f.config_json as config,
       v.value_json as value
     FROM job_template_fields f
     INNER JOIN job_creation_values v ON v.field_key = f.field_key AND v.job_id = $1
     WHERE f.template_id = $2 AND f.field_category = 'creation'
     ORDER BY f.display_order`,
    [jobId, job.template_id]
  );

  // Get action fields (from template)
  const actionFieldsResult = await pool.query(
    `SELECT 
       field_key,
       field_label,
       field_type,
       is_required,
       config_json as config
     FROM job_template_fields
     WHERE template_id = $1 AND field_category = 'action'
     ORDER BY display_order`,
    [job.template_id]
  );

  // Get execution history with action values (JSON aggregation)
  const historyResult = await pool.query<ExecutionHistoryItem>(
    `SELECT 
       a.id,
       a.performed_by,
       a.performed_at,
       a.notes,
       COALESCE(
         json_agg(
           json_build_object(
             'field_key', av.field_key,
             'field_label', av.field_label,
             'field_type', av.field_type,
             'value', av.value_json
           ) ORDER BY av.field_key
         ) FILTER (WHERE av.id IS NOT NULL),
         '[]'
       ) as action_values
     FROM job_actions a
     LEFT JOIN job_action_values av ON av.action_id = a.id
     WHERE a.job_id = $1
     GROUP BY a.id, a.performed_by, a.performed_at, a.notes
     ORDER BY a.performed_at DESC`,
    [jobId]
  );

  // Derive status using cycle-window logic (last_execution_date is already in job)
  const derivedStatus = deriveStatus(job);

  // Enrich execution history with user names
  const userIds = historyResult.rows.map((row) => row.performed_by);
  // Also include the assigned_to user
  userIds.push(job.assigned_to);
  const userNamesMap = await getUserDisplayNames(userIds);

  return {
    job: {
      ...job,
      assigned_to_name: userNamesMap.get(job.assigned_to) || "Unknown User",
    },
    template: {
      name: job.template_name,
      category: job.template_category,
      description: job.template_description,
    },
    creation_fields: creationFieldsResult.rows.map((row) => ({
      field_key: row.field_key,
      field_label: row.field_label,
      field_type: row.field_type,
      value: row.value,
      is_required: row.is_required,
      config: row.config || {},
    })),
    action_fields: actionFieldsResult.rows.map((row) => ({
      field_key: row.field_key,
      field_label: row.field_label,
      field_type: row.field_type,
      is_required: row.is_required,
      config: row.config || {},
    })),
    execution_history: historyResult.rows.map((row) => ({
      ...row,
      performed_by_name: userNamesMap.get(row.performed_by) || "Unknown User",
      action_values: Array.isArray(row.action_values) ? row.action_values : [],
    })),
    derived_status: derivedStatus,
  };
}

/**
 * Execute job action (create execution history entry)
 */
export async function executeJobAction(
  input: ExecuteJobActionInput,
  userId: string
): Promise<JobAction> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify job exists and user has access
    const jobCheck = await client.query(
      `SELECT id FROM jobs WHERE id = $1 AND created_by = $2`,
      [input.job_id, userId]
    );

    if (jobCheck.rows.length === 0) {
      throw new Error("Job not found or unauthorized");
    }

    // Insert action
    const actionResult = await client.query<JobAction>(
      `INSERT INTO job_actions (job_id, performed_by, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.job_id, userId, input.notes || null]
    );

    const action = actionResult.rows[0];

    // Get action field metadata from template
    const job = await client.query(
      `SELECT template_id FROM jobs WHERE id = $1`,
      [input.job_id]
    );

    const fieldsResult = await client.query<JobTemplateField>(
      `SELECT * FROM job_template_fields 
       WHERE template_id = $1 AND field_category = 'action'`,
      [job.rows[0].template_id]
    );

    const fieldsMap = new Map(
      fieldsResult.rows.map((f) => [f.field_key, f])
    );

    // Insert action field values
    for (const [fieldKey, value] of Object.entries(
      input.action_field_values
    )) {
      const fieldMeta = fieldsMap.get(fieldKey);
      if (!fieldMeta) {
        throw new Error(`Unknown field: ${fieldKey}`);
      }

      await client.query(
        `INSERT INTO job_action_values (action_id, field_key, field_label, field_type, value_json)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          action.id,
          fieldKey,
          fieldMeta.field_label,
          fieldMeta.field_type,
          JSON.stringify(value),
        ]
      );
    }

    // Get current job data to advance the schedule
    const jobData = await client.query(
      `SELECT frequency, next_execution_date FROM jobs WHERE id = $1`,
      [input.job_id]
    );
    
    const { frequency, next_execution_date } = jobData.rows[0];
    
    // Advance next_execution_date by one frequency period from current anchor
    const nextExecDate = new Date(next_execution_date);
    let newNextExecution = new Date(nextExecDate);
    
    switch (frequency) {
      case 'weekly':
        newNextExecution.setDate(newNextExecution.getDate() + 7);
        break;
      case 'monthly':
        newNextExecution.setMonth(newNextExecution.getMonth() + 1);
        break;
      case 'quarterly':
        newNextExecution.setMonth(newNextExecution.getMonth() + 3);
        break;
      case 'half_yearly':
        newNextExecution.setMonth(newNextExecution.getMonth() + 6);
        break;
      case 'yearly':
        newNextExecution.setFullYear(newNextExecution.getFullYear() + 1);
        break;
    }

    // Update both next_execution_date and last_execution_date
    await client.query(
      `UPDATE jobs 
       SET next_execution_date = $1,
           last_execution_date = $2,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [
        newNextExecution.toISOString().split('T')[0],
        action.performed_at,
        input.job_id
      ]
    );

    await client.query("COMMIT");

    return action;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update job
 */
export async function updateJob(
  input: UpdateJobInput,
  userId: string
): Promise<Job> {
  const pool = getPool();

  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updateFields.push(`title = $${paramIndex++}`);
    updateValues.push(input.title);
  }
  if (input.assigned_to !== undefined) {
    updateFields.push(`assigned_to = $${paramIndex++}`);
    updateValues.push(input.assigned_to);
  }
  if (input.frequency !== undefined) {
    updateFields.push(`frequency = $${paramIndex++}`);
    updateValues.push(input.frequency);
  }
  if (input.next_execution_date !== undefined) {
    const nextExecutionDate =
      typeof input.next_execution_date === "string"
        ? input.next_execution_date
        : input.next_execution_date.toISOString().split("T")[0];
    updateFields.push(`next_execution_date = $${paramIndex++}`);
    updateValues.push(nextExecutionDate);
  }

  if (updateFields.length === 0) {
    throw new Error("No fields to update");
  }

  updateValues.push(input.id, userId);

  const result = await pool.query<Job>(
    `UPDATE jobs 
     SET ${updateFields.join(", ")}
     WHERE id = $${paramIndex++} AND created_by = $${paramIndex++}
     RETURNING *`,
    updateValues
  );

  if (result.rows.length === 0) {
    throw new Error("Job not found or unauthorized");
  }

  return result.rows[0];
}

/**
 * Delete job
 */
export async function deleteJob(jobId: string, userId: string): Promise<void> {
  const pool = getPool();

  const result = await pool.query(
    `DELETE FROM jobs WHERE id = $1 AND created_by = $2 RETURNING id`,
    [jobId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Job not found or unauthorized");
  }
}

/**
 * Get jobs with derived status
 */
export async function getJobsWithStatus(
  userId: string,
  statusFilter?: JobStatus
): Promise<Array<JobWithTemplate & { derived_status: JobStatus; assigned_to_name: string }>> {
  const jobs = await getJobs(userId);

  if (jobs.length === 0) {
    return [];
  }

  // Get user names for assigned_to
  const assignedUserIds = jobs.map((j) => j.assigned_to);
  const userNamesMap = await getUserDisplayNames(assignedUserIds);

  // Calculate derived status for each job using last_execution_date from database
  const jobsWithStatus = jobs.map((job) => {
    const derived_status = deriveStatus(job);
    return {
      ...job,
      derived_status,
      assigned_to_name: userNamesMap.get(job.assigned_to) || "Unknown User",
    };
  });

  // Filter by status if provided
  if (statusFilter) {
    return jobsWithStatus.filter((j) => j.derived_status === statusFilter);
  }

  return jobsWithStatus;
}

/**
 * Get all jobs for a specific template with their status
 */
export async function getJobsByTemplateId(
  templateId: string,
  userId: string
): Promise<{
  scheduled_jobs: Array<JobWithTemplate & { derived_status: JobStatus; assigned_to_name: string }>;
  execution_history: Array<{
    job_title: string;
    job_id: string;
    performed_by: string;
    performed_by_name: string;
    performed_at: Date;
    notes: string | null;
    action_values: Array<{
      field_key: string;
      field_label: string;
      field_type: string;
      value: any;
    }>;
  }>;
}> {
  const pool = getPool();

  // Get scheduled jobs for this template
  const jobs = await getJobs(userId, { template_id: templateId });

  // Get last action for each job
  const jobIds = jobs.map((j) => j.id);

  const jobsWithStatus: Array<JobWithTemplate & { derived_status: JobStatus; assigned_to_name: string }> = [];

  if (jobIds.length > 0) {
    // Get user names for assigned_to
    const assignedUserIds = jobs.map((j) => j.assigned_to);
    const userNamesMap = await getUserDisplayNames(assignedUserIds);

    // Calculate derived status for each job using last_execution_date from database
    for (const job of jobs) {
      const derived_status = deriveStatus(job);
      jobsWithStatus.push({
        ...job,
        derived_status,
        assigned_to_name: userNamesMap.get(job.assigned_to) || "Unknown User",
      });
    }
  }

  // Get execution history for all jobs of this template with action values
  const historyResult = await pool.query<{
    job_title: string;
    job_id: string;
    performed_by: string;
    performed_at: Date;
    notes: string | null;
    action_values: any;
  }>(
    `SELECT 
       j.title as job_title,
       j.id as job_id,
       a.performed_by,
       a.performed_at,
       a.notes,
       COALESCE(
         json_agg(
           json_build_object(
             'field_key', av.field_key,
             'field_label', av.field_label,
             'field_type', av.field_type,
             'value', av.value_json
           ) ORDER BY av.field_key
         ) FILTER (WHERE av.id IS NOT NULL),
         '[]'
       ) as action_values
     FROM job_actions a
     INNER JOIN jobs j ON j.id = a.job_id
     LEFT JOIN job_action_values av ON av.action_id = a.id
     WHERE j.template_id = $1 AND j.created_by = $2
     GROUP BY j.title, j.id, a.performed_by, a.performed_at, a.notes, a.id
     ORDER BY a.performed_at DESC
     LIMIT 100`,
    [templateId, userId]
  );

  // Enrich execution history with user names
  const historyUserIds = historyResult.rows.map((row) => row.performed_by);
  const historyUserNamesMap = await getUserDisplayNames(historyUserIds);

  return {
    scheduled_jobs: jobsWithStatus,
    execution_history: historyResult.rows.map((row) => ({
      ...row,
      performed_by_name: historyUserNamesMap.get(row.performed_by) || "Unknown User",
      action_values: Array.isArray(row.action_values) ? row.action_values : [],
    })),
  };
}
