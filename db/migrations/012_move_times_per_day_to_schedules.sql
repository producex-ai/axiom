-- Remove times_per_day from log_templates
ALTER TABLE log_templates
DROP COLUMN IF EXISTS times_per_day;

-- Add times_per_day to log_schedules
ALTER TABLE log_schedules
ADD COLUMN IF NOT EXISTS times_per_day INTEGER DEFAULT 1;

-- Add constraint for times_per_day on log_schedules
DO $$ BEGIN
    ALTER TABLE log_schedules 
    ADD CONSTRAINT check_schedule_times_per_day CHECK (times_per_day >= 1 AND times_per_day <= 4);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add comment
COMMENT ON COLUMN log_schedules.times_per_day IS 'Number of times this log should be scheduled per day (1-4)';
