-- Remove unique constraint on schedule_id and log_date
-- This allows multiple logs per schedule per day (based on times_per_day)
DROP INDEX IF EXISTS idx_daily_logs_schedule_date;

-- Add a regular index for querying performance
CREATE INDEX IF NOT EXISTS idx_daily_logs_schedule_date_lookup ON daily_logs(schedule_id, log_date);

-- Add comment
COMMENT ON INDEX idx_daily_logs_schedule_date_lookup IS 'Non-unique index for querying logs by schedule and date (allows multiple logs per day)';
