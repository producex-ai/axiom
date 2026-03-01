import { getPool } from "@/lib/db/postgres";
import type {
  CreateJobTemplateInput,
  UpdateJobTemplateInput,
} from "@/lib/validators/jobValidators";

export interface JobTemplate {
  id: string;
  name: string;
  category: string;
  doc_num: string | null;
  sop: string | null;
  description: string | null;
  version: number;
  active: boolean;
  org_id: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface JobTemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  field_category: "creation" | "action";
  is_required: boolean;
  display_order: number;
  config_json: Record<string, any>;
}

export interface JobTemplateWithFields extends JobTemplate {
  fields: JobTemplateField[];
}

/**
 * Create a new job template with fields
 */
export async function createTemplate(
  input: CreateJobTemplateInput,
  userId: string,
  orgId: string
): Promise<JobTemplateWithFields> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Insert template
    const templateResult = await client.query<JobTemplate>(
      `INSERT INTO job_templates (name, category, doc_num, sop, description, created_by, org_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [input.name, input.category, input.doc_num || null, input.sop || null, input.description || null, userId, orgId]
    );

    const template = templateResult.rows[0];

    // Insert fields
    const fields: JobTemplateField[] = [];
    for (const field of input.fields) {
      const fieldResult = await client.query<JobTemplateField>(
        `INSERT INTO job_template_fields 
         (template_id, field_key, field_label, field_type, field_category, is_required, display_order, config_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          template.id,
          field.field_key,
          field.field_label,
          field.field_type,
          field.field_category,
          field.is_required,
          field.display_order,
          JSON.stringify(field.config_json || {}),
        ]
      );
      fields.push(fieldResult.rows[0]);
    }

    await client.query("COMMIT");

    return {
      ...template,
      fields,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
      // Continue to throw original error
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all job templates
 */
export async function getTemplates(orgId: string): Promise<JobTemplateWithFields[]> {
  const pool = getPool();

  const result = await pool.query<JobTemplateWithFields>(
    `SELECT 
       t.*,
       COALESCE(
         json_agg(
           json_build_object(
             'id', f.id,
             'template_id', f.template_id,
             'field_key', f.field_key,
             'field_label', f.field_label,
             'field_type', f.field_type,
             'field_category', f.field_category,
             'is_required', f.is_required,
             'display_order', f.display_order,
             'config_json', f.config_json
           ) ORDER BY f.display_order
         ) FILTER (WHERE f.id IS NOT NULL),
         '[]'
       ) as fields
     FROM job_templates t
     LEFT JOIN job_template_fields f ON f.template_id = t.id
     WHERE t.org_id = $1 AND t.active = TRUE
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [orgId]
  );

  return result.rows.map((row) => ({
    ...row,
    fields: Array.isArray(row.fields) ? row.fields : [],
  }));
}

/**
 * Get single template by ID with fields
 */
export async function getTemplateById(
  templateId: string,
  orgId: string
): Promise<JobTemplateWithFields | null> {
  const pool = getPool();

  const result = await pool.query<JobTemplateWithFields>(
    `SELECT 
       t.*,
       COALESCE(
         json_agg(
           json_build_object(
             'id', f.id,
             'template_id', f.template_id,
             'field_key', f.field_key,
             'field_label', f.field_label,
             'field_type', f.field_type,
             'field_category', f.field_category,
             'is_required', f.is_required,
             'display_order', f.display_order,
             'config_json', f.config_json
           ) ORDER BY f.display_order
         ) FILTER (WHERE f.id IS NOT NULL),
         '[]'
       ) as fields
     FROM job_templates t
     LEFT JOIN job_template_fields f ON f.template_id = t.id
     WHERE t.id = $1 AND t.org_id = $2 AND t.active = TRUE
     GROUP BY t.id`,
    [templateId, orgId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    fields: Array.isArray(row.fields) ? row.fields : [],
  };
}

/**
 * Update job template
 */
export async function updateTemplate(
  input: UpdateJobTemplateInput,
  orgId: string
): Promise<JobTemplateWithFields> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Update template basic info
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(input.name);
    }
    if (input.category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      updateValues.push(input.category);
    }
    if (input.doc_num !== undefined) {
      updateFields.push(`doc_num = $${paramIndex++}`);
      updateValues.push(input.doc_num);
    }
    if (input.sop !== undefined) {
      updateFields.push(`sop = $${paramIndex++}`);
      updateValues.push(input.sop);
    }
    if (input.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(input.description);
    }

    // Increment version
    updateFields.push(`version = version + 1`);

    updateValues.push(input.id, orgId);

    const templateResult = await client.query<JobTemplate>(
      `UPDATE job_templates 
       SET ${updateFields.join(", ")}
       WHERE id = $${paramIndex++} AND org_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    if (templateResult.rows.length === 0) {
      throw new Error("Template not found or unauthorized");
    }

    const template = templateResult.rows[0];

    // If fields are provided, update them
    let fields: JobTemplateField[] = [];
    if (input.fields) {
      // Delete existing fields
      await client.query(
        `DELETE FROM job_template_fields WHERE template_id = $1`,
        [input.id]
      );

      // Insert new fields
      for (const field of input.fields) {
        const fieldResult = await client.query<JobTemplateField>(
          `INSERT INTO job_template_fields 
           (template_id, field_key, field_label, field_type, field_category, is_required, display_order, config_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            template.id,
            field.field_key,
            field.field_label,
            field.field_type,
            field.field_category,
            field.is_required,
            field.display_order,
            JSON.stringify(field.config_json || {}),
          ]
        );
        fields.push(fieldResult.rows[0]);
      }
    } else {
      // Fetch existing fields
      const fieldsResult = await client.query<JobTemplateField>(
        `SELECT * FROM job_template_fields WHERE template_id = $1 ORDER BY display_order`,
        [input.id]
      );
      fields = fieldsResult.rows;
    }

    await client.query("COMMIT");

    return {
      ...template,
      fields,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
      // Continue to throw original error
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete job template (soft delete)
 */
export async function deleteTemplate(
  templateId: string,
  orgId: string
): Promise<void> {
  const pool = getPool();

  const result = await pool.query(
    `UPDATE job_templates SET active = FALSE, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 AND org_id = $2 AND active = TRUE 
     RETURNING id`,
    [templateId, orgId]
  );

  if (result.rows.length === 0) {
    throw new Error("Template not found or unauthorized");
  }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: string,
  orgId: string
): Promise<JobTemplateWithFields[]> {
  const pool = getPool();

  const result = await pool.query<JobTemplateWithFields>(
    `SELECT 
       t.*,
       COALESCE(
         json_agg(
           json_build_object(
             'id', f.id,
             'template_id', f.template_id,
             'field_key', f.field_key,
             'field_label', f.field_label,
             'field_type', f.field_type,
             'field_category', f.field_category,
             'is_required', f.is_required,
             'display_order', f.display_order,
             'config_json', f.config_json
           ) ORDER BY f.display_order
         ) FILTER (WHERE f.id IS NOT NULL),
         '[]'
       ) as fields
     FROM job_templates t
     LEFT JOIN job_template_fields f ON f.template_id = t.id
     WHERE t.category = $1 AND t.org_id = $2 AND t.active = TRUE
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [category, orgId]
  );

  return result.rows.map((row) => ({
    ...row,
    fields: Array.isArray(row.fields) ? row.fields : [],
  }));
}
