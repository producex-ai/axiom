import { query } from "@/lib/db/postgres";

export type ReviewTimePeriod = "1_month" | "3_months" | "6_months" | "1_year";
export type TemplateType = "task_list" | "field_input";

// Item types for task list mode (checkbox tasks)
export type TaskItem = {
  name: string;
};

// Item types for field input mode (text input fields)
export type FieldItem = {
  name: string;
  description?: string;
  required: boolean;
};

export type LogTemplate = {
  id: string;
  name: string;
  category: string | null;
  sop: string | null;
  template_type: TemplateType;
  items: TaskItem[] | FieldItem[];
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

// Type guards
export const isTaskTemplate = (
  template: LogTemplate,
): template is LogTemplate & { items: TaskItem[] } => {
  return template.template_type === "task_list";
};

export const isFieldTemplate = (
  template: LogTemplate,
): template is LogTemplate & { items: FieldItem[] } => {
  return template.template_type === "field_input";
};

export const createLogTemplate = async (
  template: Omit<LogTemplate, "id" | "created_at" | "updated_at" | "due_date">,
): Promise<LogTemplate | null> => {
  const {
    name,
    category,
    sop,
    template_type,
    items,
    org_id,
    created_by,
    review_time,
  } = template;
  try {
    const result = await query<LogTemplate>(
      `
      INSERT INTO log_templates (name, category, sop, template_type, items, org_id, created_by, review_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        name,
        category,
        sop,
        template_type,
        JSON.stringify(items),
        org_id,
        created_by,
        review_time,
      ],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating log template:", error);
    return null;
  }
};

export const updateLogTemplate = async (
  id: string,
  template: Partial<
    Omit<
      LogTemplate,
      "id" | "created_at" | "updated_at" | "org_id" | "created_by" | "due_date"
    >
  >,
  orgId: string,
): Promise<LogTemplate | null> => {
  const { name, category, sop, template_type, items, review_time } = template;
  try {
    const result = await query<LogTemplate>(
      `
            UPDATE log_templates
            SET 
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                sop = COALESCE($3, sop),
                template_type = COALESCE($4, template_type),
                items = COALESCE($5, items),
                review_time = COALESCE($6, review_time),
                updated_at = NOW()
            WHERE id = $7 AND org_id = $8
            RETURNING *
            `,
      [
        name,
        category,
        sop,
        template_type,
        items ? JSON.stringify(items) : null,
        review_time,
        id,
        orgId,
      ],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error updating log template:", error);
    return null;
  }
};

export const getLogTemplates = async (
  orgId: string,
): Promise<LogTemplateWithSchedule[]> => {
  try {
    const result = await query<LogTemplateWithSchedule>(
      `
      SELECT 
        lt.*,
        ls.id as schedule_id
      FROM log_templates lt
      LEFT JOIN log_schedules ls ON lt.id = ls.template_id 
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_DATE)
      WHERE lt.org_id = $1
      ORDER BY lt.created_at DESC
      `,
      [orgId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching log templates:", error);
    return [];
  }
};

export const getLogTemplateById = async (
  id: string,
  orgId: string,
): Promise<LogTemplateWithSchedule | null> => {
  try {
    const result = await query<LogTemplateWithSchedule>(
      `
      SELECT 
        lt.*,
        ls.id as schedule_id
      FROM log_templates lt
      LEFT JOIN log_schedules ls ON lt.id = ls.template_id 
        AND (ls.end_date IS NULL OR ls.end_date >= CURRENT_DATE)
      WHERE lt.id = $1 AND lt.org_id = $2
      LIMIT 1
      `,
      [id, orgId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error fetching log template by id:", error);
    return null;
  }
};
