-- =====================================================
-- ENHANCE USER FOOD TRACKING
-- =====================================================
-- Migration to better track user-contributed foods
-- and facilitate promotion to "Pios Food DB"
-- 
-- Date: October 8, 2025
-- =====================================================

USE calorie_tracker;

-- Add contribution tracking fields (check if columns exist first)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA='calorie_tracker' AND TABLE_NAME='foods' AND COLUMN_NAME='is_public') = 0,
    'ALTER TABLE foods ADD COLUMN is_public TINYINT(1) DEFAULT 1 COMMENT "Whether food is visible to all users (1) or private to creator (0)"',
    'SELECT "is_public already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA='calorie_tracker' AND TABLE_NAME='foods' AND COLUMN_NAME='verified_by') = 0,
    'ALTER TABLE foods ADD COLUMN verified_by INT DEFAULT NULL COMMENT "Admin user ID who verified/promoted this food"',
    'SELECT "verified_by already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA='calorie_tracker' AND TABLE_NAME='foods' AND COLUMN_NAME='verified_at') = 0,
    'ALTER TABLE foods ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL COMMENT "When this food was verified/promoted to Pios Food DB"',
    'SELECT "verified_at already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA='calorie_tracker' AND TABLE_NAME='foods' AND COLUMN_NAME='contribution_notes') = 0,
    'ALTER TABLE foods ADD COLUMN contribution_notes TEXT DEFAULT NULL COMMENT "Admin notes about this food contribution"',
    'SELECT "contribution_notes already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA='calorie_tracker' AND TABLE_NAME='foods' AND COLUMN_NAME='usage_count') = 0,
    'ALTER TABLE foods ADD COLUMN usage_count INT DEFAULT 0 COMMENT "Number of times this food has been logged by users"',
    'SELECT "usage_count already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for efficient querying
CREATE INDEX idx_foods_source_verified ON foods(source, is_verified);
CREATE INDEX idx_foods_created_by ON foods(created_by);
CREATE INDEX idx_foods_is_public ON foods(is_public);

-- Update existing foods to set proper source
UPDATE foods 
SET source = 'system', is_verified = 1, is_public = 1 
WHERE created_by IS NULL AND source = 'custom';

-- Create view for user-contributed foods (pending review)
CREATE OR REPLACE VIEW user_contributed_foods AS
SELECT 
    f.*,
    u.username as creator_username,
    u.email as creator_email,
    COUNT(DISTINCT fl.id) as times_logged,
    COUNT(DISTINCT fl.user_id) as unique_users
FROM foods f
LEFT JOIN users u ON f.created_by = u.id
LEFT JOIN food_logs fl ON f.id = fl.food_id
WHERE f.source = 'custom' 
  AND f.is_verified = 0
GROUP BY f.id
ORDER BY times_logged DESC, f.created_at DESC;

-- Create view for Pios Food DB (official verified foods)
CREATE OR REPLACE VIEW pios_food_db AS
SELECT 
    f.*,
    u.username as creator_username,
    v.username as verified_by_username,
    COUNT(DISTINCT fl.id) as total_logs
FROM foods f
LEFT JOIN users u ON f.created_by = u.id
LEFT JOIN users v ON f.verified_by = v.id
LEFT JOIN food_logs fl ON f.id = fl.food_id
WHERE f.is_verified = 1
GROUP BY f.id
ORDER BY f.name;

-- Success message
SELECT 'User food tracking enhancement completed successfully!' as status;
