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
);

-- Show table structure
DESCRIBE daily_goals;

COMMIT;