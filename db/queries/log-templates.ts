import { query } from '@/lib/db/postgres';

export type ReviewTimePeriod = '1_month' | '3_months' | '6_months' | '1_year';

export type LogTemplate = {
  id: string;
  name: string;
  category: string | null;
  sop: string | null;
  task_list: string[] | null;
  org_id: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  review_time: ReviewTimePeriod | null;
  due_date: Date | null;
};

export type LogTemplateWithSchedule = LogTemplate & {
  schedule_id: string | null;
};

export const createLogTemplate = async (
  template: Omit<LogTemplate, 'id' | 'created_at' | 'updated_at' | 'due_date'>
): Promise<LogTemplate | null> => {
  const { name, category, sop, task_list, org_id, created_by, review_time } =
    template;
  try {
    const result = await query<LogTemplate>(
      `
      INSERT INTO log_templates (name, category, sop, task_list, org_id, created_by, review_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [name, category, sop, task_list, org_id, created_by, review_time]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating log template:', error);
    return null;
  }
};

export const updateLogTemplate = async (
  id: string,
  template: Partial<
    Omit<
      LogTemplate,
      'id' | 'created_at' | 'updated_at' | 'org_id' | 'created_by' | 'due_date'
    >
  >,
  orgId: string
): Promise<LogTemplate | null> => {
  const { name, category, sop, task_list, review_time } = template;
  try {
    const result = await query<LogTemplate>(
      `
            UPDATE log_templates
            SET 
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                sop = COALESCE($3, sop),
                task_list = COALESCE($4, task_list),
                review_time = COALESCE($5, review_time),
                updated_at = NOW()
            WHERE id = $6 AND org_id = $7
            RETURNING *
            `,
      [name, category, sop, task_list, review_time, id, orgId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating log template:', error);
    return null;
  }
};

export const getLogTemplates = async (
  orgId: string
): Promise<LogTemplateWithSchedule[]> => {
  try {
    const result = await query<LogTemplateWithSchedule>(
      `
      SELECT 
        lt.*,
        ls.id as schedule_id
      FROM log_templates lt
      LEFT JOIN log_schedules ls ON lt.id = ls.template_id 
        AND ls.status = 'ACTIVE'
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_DATE)
      WHERE lt.org_id = $1
      ORDER BY lt.created_at DESC
      `,
      [orgId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching log templates:', error);
    return [];
  }
};

export const getLogTemplateById = async (
  id: string,
  orgId: string
): Promise<LogTemplateWithSchedule | null> => {
  try {
    const result = await query<LogTemplateWithSchedule>(
      `
      SELECT 
        lt.*,
        ls.id as schedule_id
      FROM log_templates lt
      LEFT JOIN log_schedules ls ON lt.id = ls.template_id 
        AND ls.status = 'ACTIVE'
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_DATE)
      WHERE lt.id = $1 AND lt.org_id = $2
      LIMIT 1
      `,
      [id, orgId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching log template by id:', error);
    return null;
  }
};
