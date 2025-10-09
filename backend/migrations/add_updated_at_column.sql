-- Migration: Add updated_at column to users table
-- Date: 2025-10-09
-- Purpose: Track when user records are last modified

-- Check if column exists and add it if not
-- This is safe to run multiple times

-- Add updated_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT NULL;

-- Set initial values for existing records (optional)
-- UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;

-- Note: MySQL will automatically update this column when records are modified
-- if you change DEFAULT NULL to DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Optional: Change to auto-update on record modification
-- ALTER TABLE users 
-- MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
