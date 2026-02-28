-- Add two_yearly and five_yearly frequencies to jobs table
-- Migration: 022

-- Drop the existing check constraint on jobs.frequency
ALTER TABLE jobs 
    DROP CONSTRAINT IF EXISTS jobs_frequency_check;

-- Re-add the constraint with the new frequency values
ALTER TABLE jobs 
    ADD CONSTRAINT jobs_frequency_check 
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly', 'two_yearly', 'five_yearly'));

-- Update the comment to reflect the new frequencies
COMMENT ON COLUMN jobs.frequency IS 'Job execution frequency: weekly, monthly, quarterly, half_yearly, yearly, two_yearly, or five_yearly';
