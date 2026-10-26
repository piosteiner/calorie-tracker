-- =============================================
-- Migration: Add updated_at column to users table
-- Date: 2025-10-09
-- Purpose: Track when user records are modified
-- =============================================

-- Add updated_at column to users table
ALTER TABLE users 
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
AFTER created_at;

-- Verify the change
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    COLUMN_DEFAULT, 
    EXTRA 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'calorie_tracker' 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'updated_at';

-- Success message
SELECT 'Migration completed: updated_at column added to users table' as status;
