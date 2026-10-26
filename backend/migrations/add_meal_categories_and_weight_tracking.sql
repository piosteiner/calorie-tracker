-- Migration: Add meal categories and weight tracking
-- Date: 2025-10-09
-- Description: Adds meal_category and meal_time to food_logs, creates weight_logs table

-- ============================================
-- FORWARD MIGRATION
-- ============================================

-- 1. Add meal category and time columns to food_logs
ALTER TABLE food_logs 
ADD COLUMN meal_category VARCHAR(20) DEFAULT 'other' AFTER logged_at,
ADD COLUMN meal_time TIME NULL AFTER meal_category;

-- 2. Add index for efficient queries by user, date, and category
ALTER TABLE food_logs 
ADD INDEX idx_user_date_category (user_id, log_date, meal_category);

-- 3. Create weight_logs table
CREATE TABLE weight_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    log_date DATE NOT NULL,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, log_date),
    INDEX idx_user_date (user_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ROLLBACK MIGRATION (commented for safety)
-- ============================================

-- To rollback, run these commands:
-- DROP TABLE IF EXISTS weight_logs;
-- ALTER TABLE food_logs DROP INDEX idx_user_date_category;
-- ALTER TABLE food_logs DROP COLUMN meal_time;
-- ALTER TABLE food_logs DROP COLUMN meal_category;
