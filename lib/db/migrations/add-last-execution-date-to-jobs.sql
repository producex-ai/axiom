-- Migration: Add last_execution_date column to jobs table
-- This enables efficient cycle-window based execution control

-- Step 1: Add new last_execution_date column (nullable initially)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_execution_date TIMESTAMP WITH TIME ZONE;

-- Step 2: Populate existing data from job_actions table
-- Set last_execution_date to the most recent action's performed_at for each job
UPDATE jobs j
SET last_execution_date = (
    SELECT MAX(ja.performed_at)
    FROM job_actions ja
    WHERE ja.job_id = j.id
)
WHERE EXISTS (
    SELECT 1
    FROM job_actions ja
    WHERE ja.job_id = j.id
);

-- Step 3: Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_jobs_last_execution_date ON jobs(last_execution_date);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN jobs.last_execution_date IS 'Timestamp of the last successful execution. Used for cycle-window based execution control.';
