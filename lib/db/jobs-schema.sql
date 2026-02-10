-- Job Templates System Schema
-- Template-driven job execution with dynamic fields

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Job Templates table
CREATE TABLE IF NOT EXISTS job_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_templates_created_by ON job_templates(created_by);
CREATE INDEX idx_job_templates_category ON job_templates(category);
CREATE INDEX idx_job_templates_active ON job_templates(active);

-- Job Template Fields table
-- Metadata-driven fields (no dynamic columns)
CREATE TABLE IF NOT EXISTS job_template_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL, -- 'text', 'number', 'date', 'select', 'textarea', 'checkbox'
    field_category TEXT NOT NULL CHECK (field_category IN ('creation', 'action')),
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER NOT NULL,
    config_json JSONB DEFAULT '{}'::jsonb, -- For field-specific config (options, validation, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_template_fields_template_id ON job_template_fields(template_id);
CREATE INDEX idx_job_template_fields_category ON job_template_fields(field_category);
CREATE UNIQUE INDEX idx_job_template_fields_template_key ON job_template_fields(template_id, field_key);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE RESTRICT,
    template_version INTEGER NOT NULL,
    title TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly')),
    next_execution_date DATE NOT NULL,
    last_execution_date TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_template_id ON jobs(template_id);
CREATE INDEX idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX idx_jobs_next_execution_date ON jobs(next_execution_date);
CREATE INDEX idx_jobs_last_execution_date ON jobs(last_execution_date);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);

COMMENT ON COLUMN jobs.frequency IS 'Job execution frequency: weekly, monthly, quarterly, half_yearly, or yearly';
COMMENT ON COLUMN jobs.last_execution_date IS 'Timestamp of the last successful execution. Used for cycle-window based execution control.';

-- Job Creation Values table
-- Stores values for creation fields
CREATE TABLE IF NOT EXISTS job_creation_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    value_json JSONB NOT NULL, -- Flexible storage for any field type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_creation_values_job_id ON job_creation_values(job_id);
CREATE UNIQUE INDEX idx_job_creation_values_job_field ON job_creation_values(job_id, field_key);

-- Job Actions table
-- Records each execution of a job
CREATE TABLE IF NOT EXISTS job_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    performed_by TEXT NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_job_actions_job_id ON job_actions(job_id);
CREATE INDEX idx_job_actions_performed_at ON job_actions(performed_at);
CREATE INDEX idx_job_actions_performed_by ON job_actions(performed_by);

-- Job Action Values table
-- Stores values for action fields
CREATE TABLE IF NOT EXISTS job_action_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID NOT NULL REFERENCES job_actions(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    value_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_action_values_action_id ON job_action_values(action_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_templates_updated_at BEFORE UPDATE ON job_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE job_templates IS 'Master job templates with versioning';
COMMENT ON TABLE job_template_fields IS 'Dynamic field definitions for templates';
COMMENT ON TABLE jobs IS 'Job instances created from templates';
COMMENT ON TABLE job_creation_values IS 'Values captured during job creation';
COMMENT ON TABLE job_actions IS 'Execution history for jobs';
COMMENT ON TABLE job_action_values IS 'Field values captured during job execution';
