-- Migration: Remove title column from jobs table
-- Purpose: Simplify jobs table by removing title field
-- Date: 2026-02-15

-- Drop title column from jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS title;
