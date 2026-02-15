-- Add soft delete support to daily_logs table
-- This allows marking logs as obsolete instead of hard deletion for audit purposes

-- Add OBSOLETE to the status check constraint by dropping and recreating it
ALTER TABLE daily_logs 
DROP CONSTRAINT IF EXISTS daily_logs_status_check;

ALTER TABLE daily_logs 
ADD CONSTRAINT daily_logs_status_check 
CHECK (status IN ('PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'OBSOLETE'));

-- Add soft delete audit fields
ALTER TABLE daily_logs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Create index for querying non-obsolete logs efficiently
CREATE INDEX IF NOT EXISTS idx_daily_logs_status_not_obsolete 
ON daily_logs(org_id, status) 
WHERE status != 'OBSOLETE';

-- Add index for obsolete logs audit queries
CREATE INDEX IF NOT EXISTS idx_daily_logs_deleted_at 
ON daily_logs(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN daily_logs.deleted_at IS 'Timestamp when the log was marked as obsolete (soft deleted)';
COMMENT ON COLUMN daily_logs.deleted_by IS 'User ID who marked the log as obsolete';

-- Update the table comment
COMMENT ON TABLE daily_logs IS 'Daily logs created from templates based on schedules. Supports soft delete via OBSOLETE status for audit purposes.';
