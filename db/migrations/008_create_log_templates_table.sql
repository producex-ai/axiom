-- Create log_templates table
CREATE TABLE IF NOT EXISTS log_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    sop TEXT,
    task_list TEXT[],
    org_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_log_templates_org_id ON log_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_log_templates_category ON log_templates(category);

-- Add comments
COMMENT ON TABLE log_templates IS 'Stores templates for logs';
COMMENT ON COLUMN log_templates.task_list IS 'List of tasks in the template';
