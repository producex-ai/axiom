import { query } from "@/lib/db/postgres";

export type LogSchedule = {
  id: string;
  template_id: string;
  org_id: string;
  start_date: Date;
  end_date: Date | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  days_of_week: number[] | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
};

export type LogScheduleWithTemplate = LogSchedule & {
  template_name: string;
  template_category: string | null;
};

export const createLogSchedule = async (
  schedule: Omit<LogSchedule, "id" | "created_at" | "updated_at">,
): Promise<LogSchedule | null> => {
  const {
    template_id,
    org_id,
    start_date,
    end_date,
    assignee_id,
    reviewer_id,
    days_of_week,
    status,
    created_by,
  } = schedule;

  try {
    const result = await query<LogSchedule>(
      `
      INSERT INTO log_schedules (
        template_id, org_id, start_date, end_date, 
        assignee_id, reviewer_id, days_of_week, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        template_id,
        org_id,
        start_date,
        end_date,
        assignee_id,
        reviewer_id,
        days_of_week,
        status,
        created_by,
      ],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating log schedule:", error);
    return null;
  }
};

export const updateLogSchedule = async (
  id: string,
  schedule: Partial<
    Omit<
      LogSchedule,
      | "id"
      | "template_id"
      | "org_id"
      | "created_at"
      | "updated_at"
      | "created_by"
    >
  >,
  orgId: string,
): Promise<LogSchedule | null> => {
  const {
    start_date,
    end_date,
    assignee_id,
    reviewer_id,
    days_of_week,
    status,
  } = schedule;

  try {
    const result = await query<LogSchedule>(
      `
      UPDATE log_schedules
      SET 
        start_date = COALESCE($1, start_date),
        end_date = $2,
        assignee_id = $3,
        reviewer_id = $4,
        days_of_week = COALESCE($5, days_of_week),
        status = COALESCE($6, status),
        updated_at = NOW()
      WHERE id = $7 AND org_id = $8
      RETURNING *
      `,
      [
        start_date,
        end_date,
        assignee_id,
        reviewer_id,
        days_of_week,
        status,
        id,
        orgId,
      ],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error updating log schedule:", error);
    return null;
  }
};

export const getLogScheduleById = async (
  id: string,
  orgId: string,
): Promise<LogSchedule | null> => {
  try {
    const result = await query<LogSchedule>(
      `
      SELECT * FROM log_schedules
      WHERE id = $1 AND org_id = $2
      LIMIT 1
      `,
      [id, orgId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching log schedule by id:", error);
    return null;
  }
};

export const getLogSchedulesByTemplateId = async (
  templateId: string,
  orgId: string,
): Promise<LogSchedule[]> => {
  try {
    const result = await query<LogSchedule>(
      `
      SELECT * FROM log_schedules
      WHERE template_id = $1 AND org_id = $2
      ORDER BY created_at DESC
      `,
      [templateId, orgId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching log schedules:", error);
    return [];
  }
};

export const getActiveLogSchedules = async (
  orgId: string,
): Promise<LogScheduleWithTemplate[]> => {
  try {
    const result = await query<LogScheduleWithTemplate>(
      `
      SELECT 
        ls.*,
        lt.name as template_name,
        lt.category as template_category
      FROM log_schedules ls
      INNER JOIN log_templates lt ON ls.template_id = lt.id
      WHERE ls.org_id = $1
        AND ls.status = 'ACTIVE'
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_DATE)
      ORDER BY ls.start_date DESC
      `,
      [orgId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching active log schedules:", error);
    return [];
  }
};
