import { query } from "../producex/postgres";

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
};

export const createLogTemplate = async (
  template: Omit<LogTemplate, "id" | "created_at" | "updated_at">,
): Promise<LogTemplate | null> => {
  const { name, category, sop, task_list, org_id, created_by } = template;
  try {
    const result = await query<LogTemplate>(
      `
      INSERT INTO log_templates (name, category, sop, task_list, org_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [name, category, sop, task_list, org_id, created_by],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating log template:", error);
    return null;
  }
};

export const getLogTemplates = async (
  orgId: string,
): Promise<LogTemplate[]> => {
  try {
    const result = await query<LogTemplate>(
      `
      SELECT * FROM log_templates
      WHERE org_id = $1
      ORDER BY created_at DESC
      `,
      [orgId],
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching log templates:", error);
    return [];
  }
};
