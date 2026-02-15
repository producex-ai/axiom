-- Create log_schedules table
CREATE TABLE IF NOT EXISTS log_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES log_templates(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    assignee_id TEXT,
    reviewer_id TEXT,
    days_of_week INTEGER[], -- 0=Sunday, 1=Monday, ..., 6=Saturday
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_log_schedules_org_id ON log_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_log_schedules_template_id ON log_schedules(template_id);
CREATE INDEX IF NOT EXISTS idx_log_schedules_assignee_id ON log_schedules(assignee_id);
CREATE INDEX IF NOT EXISTS idx_log_schedules_status ON log_schedules(status);

-- Add comments
COMMENT ON TABLE log_schedules IS 'Schedules for generating logs from templates';
COMMENT ON COLUMN log_schedules.days_of_week IS 'Array of integers representing days of week (0=Sun, 6=Sat)';
COMMENT ON COLUMN log_schedules.assignee_id IS 'Clerk User ID of the person responsible for the log';
COMMENT ON COLUMN log_schedules.reviewer_id IS 'Clerk User ID of the person reviewing the log';
