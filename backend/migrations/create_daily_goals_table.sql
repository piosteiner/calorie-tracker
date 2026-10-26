-- Create daily_goals table for per-day calorie goal tracking
-- This allows users to set different goals for different days

USE calorie_tracker;

-- Create daily_goals table
CREATE TABLE IF NOT EXISTS daily_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    goal_date DATE NOT NULL,
    goal_calories INT NOT NULL DEFAULT 2000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate goals per user per date
    UNIQUE KEY unique_user_date (user_id, goal_date),
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_goal_date (goal_date),
    INDEX idx_user_date (user_id, goal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Show table structure
DESCRIBE daily_goals;

-- Example queries for reference:

-- Get daily goal for a specific date (with fallback to default)
-- SELECT COALESCE(dg.goal_calories, u.daily_calorie_goal) as daily_goal
-- FROM users u
-- LEFT JOIN daily_goals dg ON u.id = dg.user_id AND dg.goal_date = '2025-10-07'
-- WHERE u.id = 1;

-- Set or update daily goal
-- INSERT INTO daily_goals (user_id, goal_date, goal_calories)
-- VALUES (1, '2025-10-07', 2500)
-- ON DUPLICATE KEY UPDATE goal_calories = VALUES(goal_calories), updated_at = CURRENT_TIMESTAMP;
