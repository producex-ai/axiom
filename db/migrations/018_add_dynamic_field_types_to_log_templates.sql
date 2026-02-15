-- Add dynamic field types to log templates
-- This migration adds support for both task list (checkbox) and field input (text) modes

-- Add template_type column (defaults to 'task_list' for backward compatibility)
ALTER TABLE log_templates
ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'task_list';

-- Add constraint for template_type
DO $$ BEGIN
    ALTER TABLE log_templates 
    ADD CONSTRAINT check_template_type 
    CHECK (template_type IN ('task_list', 'field_input'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add items column (JSONB for flexible field storage)
ALTER TABLE log_templates
ADD COLUMN IF NOT EXISTS items JSONB;

-- Migrate existing task_list data to items format
-- Convert TEXT[] to JSONB array of objects with 'name' property
UPDATE log_templates
SET items = (
    SELECT jsonb_agg(jsonb_build_object('name', task))
    FROM unnest(task_list) AS task
)
WHERE task_list IS NOT NULL AND items IS NULL;

-- Set items to empty array for templates with null task_list
UPDATE log_templates
SET items = '[]'::jsonb
WHERE task_list IS NULL AND items IS NULL;

-- Make items NOT NULL now that all rows have been migrated
ALTER TABLE log_templates
ALTER COLUMN items SET NOT NULL;

-- Drop the old task_list column
ALTER TABLE log_templates
DROP COLUMN IF EXISTS task_list;

-- Add index for template_type (will be frequently queried)
CREATE INDEX IF NOT EXISTS idx_log_templates_template_type ON log_templates(template_type);

-- Add comments for documentation
COMMENT ON COLUMN log_templates.template_type IS 'Template type: task_list (checkbox tasks) or field_input (text input fields)';
COMMENT ON COLUMN log_templates.items IS 'JSONB array of items. For task_list: [{name: string}]. For field_input: [{name: string, description?: string, required: boolean}]';
