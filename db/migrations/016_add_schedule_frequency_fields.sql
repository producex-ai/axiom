-- Add frequency fields to log_schedules table
-- This migration adds support for monthly, quarterly, half-yearly, and yearly scheduling

-- Add frequency column (defaults to 'weekly' for backward compatibility)
ALTER TABLE log_schedules
ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'weekly';

-- Add constraint for frequency
DO $$ BEGIN
    ALTER TABLE log_schedules 
    ADD CONSTRAINT check_schedule_frequency 
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add day_of_month column (used for monthly, quarterly, half_yearly, and yearly)
ALTER TABLE log_schedules
ADD COLUMN IF NOT EXISTS day_of_month INTEGER;

-- Add constraint for day_of_month (1-31)
DO $$ BEGIN
    ALTER TABLE log_schedules 
    ADD CONSTRAINT check_schedule_day_of_month 
    CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add month_of_year column (used for yearly scheduling)
ALTER TABLE log_schedules
ADD COLUMN IF NOT EXISTS month_of_year INTEGER;

-- Add constraint for month_of_year (1-12)
DO $$ BEGIN
    ALTER TABLE log_schedules 
    ADD CONSTRAINT check_schedule_month_of_year 
    CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add index for frequency (will be frequently queried)
CREATE INDEX IF NOT EXISTS idx_log_schedules_frequency ON log_schedules(frequency);

-- Add comments for documentation
COMMENT ON COLUMN log_schedules.frequency IS 'Schedule frequency: weekly, monthly, quarterly, half_yearly, or yearly';
COMMENT ON COLUMN log_schedules.day_of_month IS 'Day of month for non-weekly schedules (1-31). Used for monthly, quarterly, half_yearly, and yearly frequencies.';
COMMENT ON COLUMN log_schedules.month_of_year IS 'Month of year for yearly schedules (1-12, where 1=Jan, 12=Dec). Only used when frequency is yearly.';

-- Update days_of_week comment to clarify it's only for weekly
COMMENT ON COLUMN log_schedules.days_of_week IS 'Array of integers representing days of week (0=Sun, 6=Sat). Only used when frequency is weekly.';
