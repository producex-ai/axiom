import { query } from "@/lib/db/postgres";

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

export const updateLogTemplate = async (
  id: string,
  template: Partial<
    Omit<
      LogTemplate,
      "id" | "created_at" | "updated_at" | "org_id" | "created_by"
    >
  >,
  orgId: string,
): Promise<LogTemplate | null> => {
  const { name, category, sop, task_list } = template;
  try {
    const result = await query<LogTemplate>(
      `
            UPDATE log_templates
            SET 
                name = COALESCE($1, name),
                category = COALESCE($2, category),
                sop = COALESCE($3, sop),
                task_list = COALESCE($4, task_list),
                updated_at = NOW()
            WHERE id = $5 AND org_id = $6
            RETURNING *
            `,
      [name, category, sop, task_list, id, orgId],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error updating log template:", error);
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

export const getLogTemplateById = async (
  id: string,
  orgId: string,
): Promise<LogTemplate | null> => {
  try {
    const result = await query<LogTemplate>(
      `
            SELECT * FROM log_templates
            WHERE id = $1 AND org_id = $2
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
