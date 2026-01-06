-- Create daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES log_templates(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES log_schedules(id) ON DELETE CASCADE,
    assignee_id TEXT NOT NULL,
    reviewer_id TEXT,
    
    -- Task list with completion status (stored as JSONB for better querying)
    -- Example: {"Task 1": false, "Task 2": true, "Task 3": false}
    tasks JSONB NOT NULL DEFAULT '{}',
    
    -- Tasks sign-off status
    tasks_sign_off TEXT CHECK (tasks_sign_off IN ('ALL_GOOD', 'ACTION_REQUIRED')),
    
    -- Comments
    assignee_comment TEXT,
    reviewer_comment TEXT,
    
    -- Log status workflow: PENDING -> PENDING_APPROVAL -> APPROVED/REJECTED
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
    
    -- Date for which the log is created
    log_date DATE NOT NULL,
    
    -- Workflow timestamps
    submitted_at TIMESTAMPTZ, -- When assignee submitted for review
    reviewed_at TIMESTAMPTZ, -- When reviewer approved/rejected
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_daily_logs_org_id ON daily_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_template_id ON daily_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_schedule_id ON daily_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_assignee_id ON daily_logs(assignee_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_reviewer_id ON daily_logs(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_status ON daily_logs(status);
CREATE INDEX IF NOT EXISTS idx_daily_logs_log_date ON daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_org_date ON daily_logs(org_id, log_date);

-- Add unique constraint to prevent duplicate logs for same schedule and date
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_logs_schedule_date ON daily_logs(schedule_id, log_date);

-- Add comments
COMMENT ON TABLE daily_logs IS 'Daily logs created from templates based on schedules';
COMMENT ON COLUMN daily_logs.tasks IS 'JSONB object with task names as keys and completion boolean as values';
COMMENT ON COLUMN daily_logs.tasks_sign_off IS 'Assignee sign-off status: ALL_GOOD or ACTION_REQUIRED';
COMMENT ON COLUMN daily_logs.status IS 'Workflow status: PENDING (assignee working) -> PENDING_APPROVAL (submitted for review) -> APPROVED/REJECTED';
COMMENT ON COLUMN daily_logs.log_date IS 'The date for which this log was created';
COMMENT ON COLUMN daily_logs.assignee_id IS 'Clerk User ID of the person responsible for completing the log';
COMMENT ON COLUMN daily_logs.reviewer_id IS 'Clerk User ID of the person reviewing and approving the log';
COMMENT ON COLUMN daily_logs.submitted_at IS 'Timestamp when assignee submitted the log for approval';
COMMENT ON COLUMN daily_logs.reviewed_at IS 'Timestamp when reviewer approved or rejected the log';
