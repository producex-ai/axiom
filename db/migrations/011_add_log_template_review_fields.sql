-- Create review_time enum type
DO $$ BEGIN
    CREATE TYPE review_time_period AS ENUM ('1_month', '3_months', '6_months', '1_year');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to log_templates
ALTER TABLE log_templates 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_time review_time_period,
ADD COLUMN IF NOT EXISTS times_per_day INTEGER DEFAULT 1;

-- Add constraint for times_per_day
DO $$ BEGIN
    ALTER TABLE log_templates 
    ADD CONSTRAINT check_times_per_day CHECK (times_per_day >= 1 AND times_per_day <= 4);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add index on due_date
CREATE INDEX IF NOT EXISTS idx_log_templates_due_date ON log_templates(due_date);

-- Add comments
COMMENT ON COLUMN log_templates.due_date IS 'Next review due date, calculated from updated_at + review_time';
COMMENT ON COLUMN log_templates.review_time IS 'Review interval period (1_month, 3_months, 6_months, 1_year)';
COMMENT ON COLUMN log_templates.times_per_day IS 'Number of times this log should be scheduled per day (1-4)';

-- Create function to calculate due_date based on review_time
CREATE OR REPLACE FUNCTION update_log_template_due_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.review_time IS NOT NULL THEN
        CASE NEW.review_time
            WHEN '1_month' THEN
                NEW.due_date := NEW.updated_at + INTERVAL '1 month';
            WHEN '3_months' THEN
                NEW.due_date := NEW.updated_at + INTERVAL '3 months';
            WHEN '6_months' THEN
                NEW.due_date := NEW.updated_at + INTERVAL '6 months';
            WHEN '1_year' THEN
                NEW.due_date := NEW.updated_at + INTERVAL '1 year';
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_log_template_due_date ON log_templates;
CREATE TRIGGER trigger_update_log_template_due_date
    BEFORE INSERT OR UPDATE OF updated_at, review_time
    ON log_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_log_template_due_date();
