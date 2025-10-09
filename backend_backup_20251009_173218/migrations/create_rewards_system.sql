-- ============================================
-- REWARDS & GAMIFICATION SYSTEM
-- ============================================
-- Date: 2025-10-09
-- Description: Complete rewards/points system with purchases, streaks, and achievements

-- ============================================
-- 1. USER POINTS TABLE
-- ============================================
-- Tracks total points and lifetime stats for each user

CREATE TABLE IF NOT EXISTS user_points (
    user_id INT PRIMARY KEY,
    current_points INT NOT NULL DEFAULT 0,
    lifetime_points INT NOT NULL DEFAULT 0,
    points_spent INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE NULL,
    last_daily_reward_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_points (current_points DESC),
    INDEX idx_level (level DESC),
    INDEX idx_streak (current_streak DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. POINT TRANSACTIONS TABLE
-- ============================================
-- Complete history of all point earnings and spending

CREATE TABLE IF NOT EXISTS point_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    points INT NOT NULL,
    transaction_type ENUM('earn', 'spend', 'refund', 'admin_adjustment') NOT NULL DEFAULT 'earn',
    reason VARCHAR(100) NOT NULL,
    description TEXT NULL,
    reference_type VARCHAR(50) NULL COMMENT 'e.g., food_log, weight_log, purchase',
    reference_id INT NULL COMMENT 'ID of related record',
    metadata JSON NULL COMMENT 'Additional data like streak count, item purchased, etc.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at DESC),
    INDEX idx_type (transaction_type),
    INDEX idx_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. REWARD ITEMS CATALOG
-- ============================================
-- All purchasable items in the rewards shop

CREATE TABLE IF NOT EXISTS reward_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    category ENUM('theme', 'badge', 'feature', 'avatar', 'powerup', 'challenge') NOT NULL,
    cost_points INT NOT NULL,
    item_data JSON NULL COMMENT 'Theme colors, badge icon, feature config, etc.',
    is_active BOOLEAN DEFAULT TRUE,
    is_limited_edition BOOLEAN DEFAULT FALSE,
    stock_quantity INT NULL COMMENT 'NULL = unlimited',
    purchase_limit INT NULL COMMENT 'Max purchases per user, NULL = unlimited',
    required_level INT DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category, is_active),
    INDEX idx_cost (cost_points),
    INDEX idx_active (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. USER PURCHASES TABLE
-- ============================================
-- Track what users have purchased

CREATE TABLE IF NOT EXISTS user_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    points_paid INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Can be deactivated/equipped',
    is_equipped BOOLEAN DEFAULT FALSE COMMENT 'Currently using (themes, avatars)',
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL COMMENT 'For temporary items like powerups',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES reward_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_item (user_id, item_id),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_equipped (user_id, is_equipped),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. USER STREAKS TABLE
-- ============================================
-- Track various user activity streaks

CREATE TABLE IF NOT EXISTS user_streaks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    streak_type ENUM('daily_login', 'food_logging', 'weight_logging', 'goal_achievement', 'complete_day') NOT NULL,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE NULL,
    streak_start_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_streak_type (user_id, streak_type),
    INDEX idx_streak (user_id, streak_type, current_streak DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. USER ACHIEVEMENTS TABLE
-- ============================================
-- Track unlocked achievements/badges

CREATE TABLE IF NOT EXISTS user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_code VARCHAR(50) NOT NULL COMMENT 'e.g., FIRST_FOOD_LOG, WEEK_STREAK, GOAL_10_DAYS',
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT NULL,
    achievement_icon VARCHAR(50) NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_code),
    INDEX idx_code (achievement_code),
    INDEX idx_user_date (user_id, unlocked_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SEED DATA: Initial Reward Items
-- ============================================

INSERT INTO reward_items (name, description, category, cost_points, item_data, display_order) VALUES
-- Themes
('Dark Mode Theme', 'Sleek dark theme to reduce eye strain', 'theme', 1000, '{"theme_id": "dark", "colors": {"primary": "#1a1a1a", "accent": "#4a9eff"}}', 1),
('Ocean Blue Theme', 'Calming blue ocean-inspired theme', 'theme', 1500, '{"theme_id": "ocean", "colors": {"primary": "#0077be", "accent": "#87ceeb"}}', 2),
('Forest Green Theme', 'Natural green forest theme', 'theme', 1500, '{"theme_id": "forest", "colors": {"primary": "#228b22", "accent": "#90ee90"}}', 3),
('Sunset Orange Theme', 'Warm sunset orange theme', 'theme', 2000, '{"theme_id": "sunset", "colors": {"primary": "#ff6347", "accent": "#ffa500"}}', 4),

-- Badges
('First Steps Badge', 'Logged your first meal', 'badge', 0, '{"badge_icon": "🏆", "badge_color": "#ffd700"}', 10),
('Week Warrior Badge', '7-day logging streak', 'badge', 500, '{"badge_icon": "⭐", "badge_color": "#c0c0c0"}', 11),
('Month Master Badge', '30-day logging streak', 'badge', 2000, '{"badge_icon": "💎", "badge_color": "#4169e1"}', 12),
('Goal Crusher Badge', 'Met calorie goal 10 times', 'badge', 1500, '{"badge_icon": "🎯", "badge_color": "#ff1493"}', 13),
('Early Bird Badge', 'Logged breakfast before 10am for 7 days', 'badge', 1000, '{"badge_icon": "🌅", "badge_color": "#ff6347"}', 14),

-- Features
('Export Data Feature', 'Export your nutrition data to CSV/JSON', 'feature', 3000, '{"feature_code": "export_data", "duration": "permanent"}', 20),
('Advanced Analytics', 'Unlock detailed nutrition analytics and trends', 'feature', 5000, '{"feature_code": "advanced_analytics", "duration": "permanent"}', 21),
('Custom Meal Categories', 'Create your own custom meal categories', 'feature', 2500, '{"feature_code": "custom_categories", "duration": "permanent"}', 22),
('Recipe Save Slots', 'Save up to 50 favorite recipes', 'feature', 2000, '{"feature_code": "recipe_slots", "slots": 50}', 23),

-- Power-ups (Temporary)
('Double Points (24h)', 'Earn 2x points for 24 hours', 'powerup', 1500, '{"powerup_code": "double_points", "duration_hours": 24, "multiplier": 2}', 30),
('Calorie Flex Pass (7d)', 'Add 200 cal to daily goal for 7 days', 'powerup', 1000, '{"powerup_code": "calorie_flex", "duration_days": 7, "calorie_bonus": 200}', 31),
('Streak Freeze', 'Protect your streak for 1 day', 'powerup', 750, '{"powerup_code": "streak_freeze", "duration_days": 1}', 32),

-- Challenges
('Weekly Challenge Access', 'Unlock special weekly challenges', 'challenge', 4000, '{"challenge_code": "weekly_unlock", "duration": "permanent"}', 40),
('Monthly Challenge Access', 'Unlock special monthly challenges', 'challenge', 8000, '{"challenge_code": "monthly_unlock", "duration": "permanent"}', 41);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: User Points Summary
CREATE OR REPLACE VIEW v_user_points_summary AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(up.current_points, 0) as current_points,
    COALESCE(up.lifetime_points, 0) as lifetime_points,
    COALESCE(up.points_spent, 0) as points_spent,
    COALESCE(up.level, 1) as level,
    COALESCE(up.current_streak, 0) as current_streak,
    COALESCE(up.longest_streak, 0) as longest_streak,
    up.last_activity_date,
    COUNT(DISTINCT ach.id) as achievements_count,
    COUNT(DISTINCT pur.id) as items_owned
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
LEFT JOIN user_achievements ach ON u.id = ach.user_id
LEFT JOIN user_purchases pur ON u.id = pur.user_id AND pur.is_active = TRUE
GROUP BY u.id, u.username, up.current_points, up.lifetime_points, up.points_spent, 
         up.level, up.current_streak, up.longest_streak, up.last_activity_date;

-- View: Leaderboard
CREATE OR REPLACE VIEW v_points_leaderboard AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(up.current_points, 0) as current_points,
    COALESCE(up.lifetime_points, 0) as lifetime_points,
    COALESCE(up.level, 1) as level,
    COALESCE(up.current_streak, 0) as current_streak,
    COUNT(DISTINCT ach.id) as achievements_count,
    RANK() OVER (ORDER BY COALESCE(up.current_points, 0) DESC) as points_rank,
    RANK() OVER (ORDER BY COALESCE(up.current_streak, 0) DESC) as streak_rank
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
LEFT JOIN user_achievements ach ON u.id = ach.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.username, up.current_points, up.lifetime_points, up.level, up.current_streak
ORDER BY current_points DESC;

-- ============================================
-- ROLLBACK INSTRUCTIONS (COMMENTED)
-- ============================================

-- To rollback this migration, run:
-- DROP VIEW IF EXISTS v_points_leaderboard;
-- DROP VIEW IF EXISTS v_user_points_summary;
-- DROP TABLE IF EXISTS user_achievements;
-- DROP TABLE IF EXISTS user_streaks;
-- DROP TABLE IF EXISTS user_purchases;
-- DROP TABLE IF EXISTS reward_items;
-- DROP TABLE IF EXISTS point_transactions;
-- DROP TABLE IF EXISTS user_points;
