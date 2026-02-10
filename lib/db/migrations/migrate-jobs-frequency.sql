-- Migration: Replace frequency_value and frequency_unit with single frequency field
-- This migration converts the jobs table to use predefined frequency values

-- Step 1: Add new frequency column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS frequency TEXT;

-- Step 2: Migrate existing data
-- Map frequency_value + frequency_unit to predefined frequency
UPDATE jobs
SET frequency = CASE
    -- Weekly: 1 week or 7 days or 1 day
    WHEN (frequency_value = 1 AND frequency_unit = 'weeks') OR 
         (frequency_value = 7 AND frequency_unit = 'days') OR
         (frequency_value = 1 AND frequency_unit = 'days') THEN 'weekly'
    -- Monthly: 1 month or 30 days
    WHEN (frequency_value = 1 AND frequency_unit = 'months') OR 
         (frequency_value = 30 AND frequency_unit = 'days') THEN 'monthly'
    -- Quarterly: 3 months
    WHEN frequency_value = 3 AND frequency_unit = 'months' THEN 'quarterly'
    -- Half Yearly: 6 months
    WHEN frequency_value = 6 AND frequency_unit = 'months' THEN 'half_yearly'
    -- Yearly: 1 year or 12 months
    WHEN (frequency_value = 1 AND frequency_unit = 'years') OR 
         (frequency_value = 12 AND frequency_unit = 'months') THEN 'yearly'
    -- Default: monthly for any other combination
    ELSE 'monthly'
END
WHERE frequency IS NULL;

-- Step 3: Add constraint after migration
ALTER TABLE jobs ALTER COLUMN frequency SET NOT NULL;
ALTER TABLE jobs ADD CONSTRAINT jobs_frequency_check 
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'));

-- Step 4: Drop old columns
ALTER TABLE jobs DROP COLUMN IF EXISTS frequency_value;
ALTER TABLE jobs DROP COLUMN IF EXISTS frequency_unit;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN jobs.frequency IS 'Job execution frequency: weekly, monthly, quarterly, half_yearly, or yearly';
