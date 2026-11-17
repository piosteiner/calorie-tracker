-- 2026-11 points redesign: points per day (daily_progress), levels and badges; no shop, no spending.
-- Everyone starts from zero on 2026-11-17 (START_DATE in services/progressService.js).
-- The old tables were backed up on the server before this ran.

CREATE TABLE IF NOT EXISTS daily_progress (
    user_id INT NOT NULL,
    day DATE NOT NULL,
    logged TINYINT(1) NOT NULL DEFAULT 0,
    complete TINYINT(1) NOT NULL DEFAULT 0,
    on_target TINYINT(1) NOT NULL DEFAULT 0,
    weighed TINYINT(1) NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, day),
    CONSTRAINT daily_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- badges live in user_achievements (codes from progressService.js); the old ones go
DELETE FROM user_achievements;

DROP VIEW IF EXISTS v_points_leaderboard;
DROP VIEW IF EXISTS v_user_points_summary;
DROP TABLE IF EXISTS user_purchases;
DROP TABLE IF EXISTS reward_items;
DROP TABLE IF EXISTS point_transactions;
DROP TABLE IF EXISTS user_food_milestones;
DROP TABLE IF EXISTS user_weight_milestones;
DROP TABLE IF EXISTS user_points;
