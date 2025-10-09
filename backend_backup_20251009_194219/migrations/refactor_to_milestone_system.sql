-- Migration: Refactor from streak-based to milestone-based progression
-- Purpose: Remove FOMO-inducing streaks, implement healthy milestone levels
-- Date: 2025-10-09

-- ============================================================================
-- DROP OLD STREAK SYSTEM
-- ============================================================================

-- Drop streak-related achievements
DELETE FROM user_achievements WHERE achievement_code IN ('WEEK_STREAK', 'MONTH_STREAK');

-- Drop streaks table
DROP TABLE IF EXISTS user_streaks;

-- ============================================================================
-- CREATE MILESTONE TRACKING TABLES
-- ============================================================================

-- Track food logging milestones and multiplier levels
CREATE TABLE IF NOT EXISTS user_food_milestones (
    user_id INT PRIMARY KEY,
    total_logs INT DEFAULT 0,
    milestone_level INT DEFAULT 1,
    points_multiplier DECIMAL(3,2) DEFAULT 1.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_milestone_level (milestone_level),
    INDEX idx_total_logs (total_logs)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track weight logging milestones and multiplier levels
CREATE TABLE IF NOT EXISTS user_weight_milestones (
    user_id INT PRIMARY KEY,
    total_logs INT DEFAULT 0,
    milestone_level INT DEFAULT 1,
    points_multiplier DECIMAL(3,2) DEFAULT 1.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_milestone_level (milestone_level),
    INDEX idx_total_logs (total_logs)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MILESTONE LEVEL THRESHOLDS
-- ============================================================================
-- Each level increases multiplier by 0.1x
-- 
-- FOOD LOG MILESTONES:
-- Level 1:    0 logs  -> 1.0x multiplier (base)
-- Level 2:   10 logs  -> 1.1x multiplier
-- Level 3:   25 logs  -> 1.2x multiplier
-- Level 4:   50 logs  -> 1.3x multiplier
-- Level 5:  100 logs  -> 1.4x multiplier
-- Level 6:  200 logs  -> 1.5x multiplier
-- Level 7:  350 logs  -> 1.6x multiplier
-- Level 8:  500 logs  -> 1.7x multiplier
-- Level 9:  750 logs  -> 1.8x multiplier
-- Level 10: 1000 logs -> 1.9x multiplier
-- Level 11: 1500 logs -> 2.0x multiplier
-- Level 12: 2000 logs -> 2.1x multiplier
--
-- WEIGHT LOG MILESTONES:
-- Level 1:   0 logs  -> 1.0x multiplier (base)
-- Level 2:   5 logs  -> 1.1x multiplier
-- Level 3:  10 logs  -> 1.2x multiplier
-- Level 4:  20 logs  -> 1.3x multiplier
-- Level 5:  35 logs  -> 1.4x multiplier
-- Level 6:  50 logs  -> 1.5x multiplier
-- Level 7:  75 logs  -> 1.6x multiplier
-- Level 8: 100 logs  -> 1.7x multiplier
-- Level 9: 150 logs  -> 1.8x multiplier
-- Level 10: 200 logs -> 1.9x multiplier
-- Level 11: 300 logs -> 2.0x multiplier
-- Level 12: 400 logs -> 2.1x multiplier

-- ============================================================================
-- INITIALIZE MILESTONE DATA FOR EXISTING USERS
-- ============================================================================

-- Initialize food milestones based on existing logs
INSERT INTO user_food_milestones (user_id, total_logs, milestone_level, points_multiplier)
SELECT 
    user_id,
    COUNT(*) as total_logs,
    CASE
        WHEN COUNT(*) >= 2000 THEN 12
        WHEN COUNT(*) >= 1500 THEN 11
        WHEN COUNT(*) >= 1000 THEN 10
        WHEN COUNT(*) >= 750 THEN 9
        WHEN COUNT(*) >= 500 THEN 8
        WHEN COUNT(*) >= 350 THEN 7
        WHEN COUNT(*) >= 200 THEN 6
        WHEN COUNT(*) >= 100 THEN 5
        WHEN COUNT(*) >= 50 THEN 4
        WHEN COUNT(*) >= 25 THEN 3
        WHEN COUNT(*) >= 10 THEN 2
        ELSE 1
    END as milestone_level,
    CASE
        WHEN COUNT(*) >= 2000 THEN 2.10
        WHEN COUNT(*) >= 1500 THEN 2.00
        WHEN COUNT(*) >= 1000 THEN 1.90
        WHEN COUNT(*) >= 750 THEN 1.80
        WHEN COUNT(*) >= 500 THEN 1.70
        WHEN COUNT(*) >= 350 THEN 1.60
        WHEN COUNT(*) >= 200 THEN 1.50
        WHEN COUNT(*) >= 100 THEN 1.40
        WHEN COUNT(*) >= 50 THEN 1.30
        WHEN COUNT(*) >= 25 THEN 1.20
        WHEN COUNT(*) >= 10 THEN 1.10
        ELSE 1.00
    END as points_multiplier
FROM food_logs
GROUP BY user_id
ON DUPLICATE KEY UPDATE 
    total_logs = VALUES(total_logs),
    milestone_level = VALUES(milestone_level),
    points_multiplier = VALUES(points_multiplier);

-- Initialize weight milestones based on existing logs
INSERT INTO user_weight_milestones (user_id, total_logs, milestone_level, points_multiplier)
SELECT 
    user_id,
    COUNT(*) as total_logs,
    CASE
        WHEN COUNT(*) >= 400 THEN 12
        WHEN COUNT(*) >= 300 THEN 11
        WHEN COUNT(*) >= 200 THEN 10
        WHEN COUNT(*) >= 150 THEN 9
        WHEN COUNT(*) >= 100 THEN 8
        WHEN COUNT(*) >= 75 THEN 7
        WHEN COUNT(*) >= 50 THEN 6
        WHEN COUNT(*) >= 35 THEN 5
        WHEN COUNT(*) >= 20 THEN 4
        WHEN COUNT(*) >= 10 THEN 3
        WHEN COUNT(*) >= 5 THEN 2
        ELSE 1
    END as milestone_level,
    CASE
        WHEN COUNT(*) >= 400 THEN 2.10
        WHEN COUNT(*) >= 300 THEN 2.00
        WHEN COUNT(*) >= 200 THEN 1.90
        WHEN COUNT(*) >= 150 THEN 1.80
        WHEN COUNT(*) >= 100 THEN 1.70
        WHEN COUNT(*) >= 75 THEN 1.60
        WHEN COUNT(*) >= 50 THEN 1.50
        WHEN COUNT(*) >= 35 THEN 1.40
        WHEN COUNT(*) >= 20 THEN 1.30
        WHEN COUNT(*) >= 10 THEN 1.20
        WHEN COUNT(*) >= 5 THEN 1.10
        ELSE 1.00
    END as points_multiplier
FROM weight_logs
GROUP BY user_id
ON DUPLICATE KEY UPDATE 
    total_logs = VALUES(total_logs),
    milestone_level = VALUES(milestone_level),
    points_multiplier = VALUES(points_multiplier);

-- ============================================================================
-- UPDATE ACHIEVEMENT SYSTEM
-- ============================================================================

-- Update achievement descriptions to reflect milestone system
UPDATE reward_items 
SET description = 'Awarded for reaching food logging milestones'
WHERE name = 'First Steps Badge';

UPDATE reward_items 
SET description = 'Awarded for dedication to weight tracking milestones'
WHERE name = 'Consistency Crown';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Milestone system migration completed successfully!' as status;
SELECT COUNT(*) as users_with_food_milestones FROM user_food_milestones;
SELECT COUNT(*) as users_with_weight_milestones FROM user_weight_milestones;
