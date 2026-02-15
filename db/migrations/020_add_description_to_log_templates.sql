-- Add description field to log_templates table
ALTER TABLE log_templates 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN log_templates.description IS 'Optional description providing additional context for the log template';
