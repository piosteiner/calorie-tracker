const db = require('../database');

/**
 * Points Service
 * Handles all point reward logic, transactions, streaks, and level calculations
 */

class PointsService {
    // ============================================
    // POINT REWARDS CONFIGURATION
    // ============================================
    
    static POINT_REWARDS = {
        DAILY_LOGIN: 100,
        FOOD_LOG: 50,               // Base points, multiplied by food milestone level
        WEIGHT_LOG: 150,            // Base points, multiplied by weight milestone level
        COMPLETE_DAY: 250,          // Log breakfast, lunch, dinner
        GOAL_ACHIEVED: 300,         // Meet daily calorie goal
        EARLY_BIRD: 100,            // Log breakfast before 10am
        FIRST_FOOD_LOG: 500,
        FIRST_WEIGHT_LOG: 500,
        MILESTONE_LEVEL_UP: 250     // Bonus for reaching new milestone level
    };

    static LEVEL_THRESHOLDS = [
        0,      // Level 1
        1000,   // Level 2
        2500,   // Level 3
        5000,   // Level 4
        10000,  // Level 5
        20000,  // Level 6
        35000,  // Level 7
        55000,  // Level 8
        80000,  // Level 9
        110000  // Level 10
    ];

    // Food logging milestone thresholds
    static FOOD_MILESTONE_THRESHOLDS = [
        { logs: 0, level: 1, multiplier: 1.0 },
        { logs: 10, level: 2, multiplier: 1.1 },
        { logs: 25, level: 3, multiplier: 1.2 },
        { logs: 50, level: 4, multiplier: 1.3 },
        { logs: 100, level: 5, multiplier: 1.4 },
        { logs: 200, level: 6, multiplier: 1.5 },
        { logs: 350, level: 7, multiplier: 1.6 },
        { logs: 500, level: 8, multiplier: 1.7 },
        { logs: 750, level: 9, multiplier: 1.8 },
        { logs: 1000, level: 10, multiplier: 1.9 },
        { logs: 1500, level: 11, multiplier: 2.0 },
        { logs: 2000, level: 12, multiplier: 2.1 }
    ];

    // Weight logging milestone thresholds
    static WEIGHT_MILESTONE_THRESHOLDS = [
        { logs: 0, level: 1, multiplier: 1.0 },
        { logs: 5, level: 2, multiplier: 1.1 },
        { logs: 10, level: 3, multiplier: 1.2 },
        { logs: 20, level: 4, multiplier: 1.3 },
        { logs: 35, level: 5, multiplier: 1.4 },
        { logs: 50, level: 6, multiplier: 1.5 },
        { logs: 75, level: 7, multiplier: 1.6 },
        { logs: 100, level: 8, multiplier: 1.7 },
        { logs: 150, level: 9, multiplier: 1.8 },
        { logs: 200, level: 10, multiplier: 1.9 },
        { logs: 300, level: 11, multiplier: 2.0 },
        { logs: 400, level: 12, multiplier: 2.1 }
    ];

    // ============================================
    // CORE POINTS MANAGEMENT
    // ============================================

    /**
     * Initialize points account for new user
     */
    static async initializeUserPoints(userId) {
        try {
            await db.query(`
                INSERT IGNORE INTO user_points (user_id, current_points, lifetime_points, level)
                VALUES (?, 0, 0, 1)
            `, [userId]);
            
            return true;
        } catch (error) {
            console.error('Error initializing user points:', error);
            throw error;
        }
    }

    /**
     * Award points to user with transaction record
     */
    static async awardPoints(userId, points, reason, description = null, referenceType = null, referenceId = null, metadata = null) {
        try {
            // Ensure user has points account
            await this.initializeUserPoints(userId);

            // Start transaction
            return await db.transaction(async (connection) => {
                // Update user points
                await connection.execute(`
                    UPDATE user_points 
                    SET current_points = current_points + ?,
                        lifetime_points = lifetime_points + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `, [points, points, userId]);

                // Record transaction
                const [result] = await connection.execute(`
                    INSERT INTO point_transactions 
                    (user_id, points, transaction_type, reason, description, reference_type, reference_id, metadata)
                    VALUES (?, ?, 'earn', ?, ?, ?, ?, ?)
                `, [userId, points, reason, description, referenceType, referenceId, metadata ? JSON.stringify(metadata) : null]);

                // Check for level up
                await this.checkAndHandleLevelUp(userId, connection);

                return {
                    success: true,
                    transactionId: result.insertId,
                    pointsAwarded: points
                };
            });
        } catch (error) {
            console.error('Error awarding points:', error);
            throw error;
        }
    }

    /**
     * Spend points (for purchases)
     */
    static async spendPoints(userId, points, reason, description = null, referenceType = null, referenceId = null) {
        try {
            return await db.transaction(async (connection) => {
                // Check if user has enough points
                const [userPoints] = await connection.execute(
                    'SELECT current_points FROM user_points WHERE user_id = ?',
                    [userId]
                );

                if (!userPoints[0] || userPoints[0].current_points < points) {
                    throw new Error('Insufficient points');
                }

                // Deduct points
                await connection.execute(`
                    UPDATE user_points 
                    SET current_points = current_points - ?,
                        points_spent = points_spent + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `, [points, points, userId]);

                // Record transaction
                const [result] = await connection.execute(`
                    INSERT INTO point_transactions 
                    (user_id, points, transaction_type, reason, description, reference_type, reference_id)
                    VALUES (?, ?, 'spend', ?, ?, ?, ?)
                `, [userId, -points, reason, description, referenceType, referenceId]);

                return {
                    success: true,
                    transactionId: result.insertId,
                    pointsSpent: points,
                    remainingPoints: userPoints[0].current_points - points
                };
            });
        } catch (error) {
            console.error('Error spending points:', error);
            throw error;
        }
    }

    // ============================================
    // LEVEL SYSTEM
    // ============================================

    /**
     * Calculate level based on lifetime points
     */
    static calculateLevel(lifetimePoints) {
        for (let level = this.LEVEL_THRESHOLDS.length; level >= 1; level--) {
            if (lifetimePoints >= this.LEVEL_THRESHOLDS[level - 1]) {
                return level;
            }
        }
        return 1;
    }

    /**
     * Check if user leveled up and award bonus
     */
    static async checkAndHandleLevelUp(userId, connection = null) {
        const executeQuery = connection ? connection.execute.bind(connection) : db.query.bind(db);

        const [userPoints] = await executeQuery(
            'SELECT lifetime_points, level FROM user_points WHERE user_id = ?',
            [userId]
        );

        if (!userPoints[0]) return false;

        const currentLevel = userPoints[0].level;
        const newLevel = this.calculateLevel(userPoints[0].lifetime_points);

        if (newLevel > currentLevel) {
            // Level up!
            await executeQuery(`
                UPDATE user_points 
                SET level = ?,
                    current_points = current_points + ?
                WHERE user_id = ?
            `, [newLevel, this.POINT_REWARDS.LEVEL_UP, userId]);

            // Record level up bonus
            await executeQuery(`
                INSERT INTO point_transactions 
                (user_id, points, transaction_type, reason, description)
                VALUES (?, ?, 'earn', 'level_up', ?)
            `, [userId, this.POINT_REWARDS.MILESTONE_LEVEL_UP, `Leveled up to Level ${newLevel}!`]);

            return { leveledUp: true, newLevel, bonus: this.POINT_REWARDS.MILESTONE_LEVEL_UP };
        }

        return { leveledUp: false };
    }

    // ============================================
    // DAILY LOGIN REWARDS
    // ============================================

    /**
     * Award daily login bonus (once per day)
     */
    static async awardDailyLogin(userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Check if already claimed today
            const [lastReward] = await db.query(
                'SELECT last_daily_reward_date FROM user_points WHERE user_id = ?',
                [userId]
            );

            if (lastReward[0] && lastReward[0].last_daily_reward_date === today) {
                return { alreadyClaimed: true, message: 'Daily reward already claimed today' };
            }

            // Update last daily reward date and activity
            await db.query(`
                UPDATE user_points 
                SET last_activity_date = ?,
                    last_daily_reward_date = ?
                WHERE user_id = ?
            `, [today, today, userId]);

            // Award points
            const result = await this.awardPoints(
                userId,
                this.POINT_REWARDS.DAILY_LOGIN,
                'daily_login',
                'Daily login reward',
                'daily_login',
                null,
                { date: today }
            );

            return {
                success: true,
                pointsAwarded: this.POINT_REWARDS.DAILY_LOGIN,
                ...result
            };
        } catch (error) {
            console.error('Error awarding daily login:', error);
            throw error;
        }
    }

    // ============================================
    // MILESTONE MANAGEMENT
    // ============================================

    /**
     * Get current milestone level and multiplier for food logs
     */
    static async getFoodMilestone(userId) {
        try {
            // Ensure milestone record exists
            await db.query(`
                INSERT IGNORE INTO user_food_milestones (user_id, total_logs, milestone_level, points_multiplier)
                VALUES (?, 0, 1, 1.00)
            `, [userId]);
            
            const milestoneResult = await db.query(`
                SELECT total_logs, milestone_level, points_multiplier, created_at, last_updated
                FROM user_food_milestones
                WHERE user_id = ?
            `, [userId]);
            
            return milestoneResult[0];
        } catch (error) {
            console.error('Error getting food milestone:', error);
            throw error;
        }
    }

    /**
     * Get current milestone level and multiplier for weight logs
     */
    static async getWeightMilestone(userId) {
        try {
            // Ensure milestone record exists
            await db.query(`
                INSERT IGNORE INTO user_weight_milestones (user_id, total_logs, milestone_level, points_multiplier)
                VALUES (?, 0, 1, 1.00)
            `, [userId]);

            const milestone = await db.query(`
                SELECT total_logs, milestone_level, points_multiplier, created_at, last_updated
                FROM user_weight_milestones
                WHERE user_id = ?
            `, [userId]);

            return milestone[0];
        } catch (error) {
            console.error('Error getting weight milestone:', error);
            throw error;
        }
    }

    /**
     * Update food milestone after logging food
     */
    static async checkFoodMilestone(userId, connection = null) {
        try {
            const executeQuery = connection ? connection.execute.bind(connection) : db.query.bind(db);

            // Get current milestone
            const [current] = await executeQuery(`
                SELECT total_logs, milestone_level, points_multiplier
                FROM user_food_milestones
                WHERE user_id = ?
            `, [userId]);

            if (!current[0]) {
                // Initialize if doesn't exist
                await executeQuery(`
                    INSERT IGNORE INTO user_food_milestones (user_id, total_logs, milestone_level, points_multiplier)
                    VALUES (?, 1, 1, 1.00)
                `, [userId]);
                return { newTotalLogs: 1, milestone_level: 1, multiplier: 1.0, leveledUp: false };
            }

            const newTotal = current[0].total_logs + 1;
            const currentLevel = current[0].milestone_level;

            // Find new level based on total logs
            let newLevel = currentLevel;
            let newMultiplier = current[0].points_multiplier;

            for (let i = this.FOOD_MILESTONE_THRESHOLDS.length - 1; i >= 0; i--) {
                if (newTotal >= this.FOOD_MILESTONE_THRESHOLDS[i].logs) {
                    newLevel = this.FOOD_MILESTONE_THRESHOLDS[i].level;
                    newMultiplier = this.FOOD_MILESTONE_THRESHOLDS[i].multiplier;
                    break;
                }
            }

            // Update milestone
            await executeQuery(`
                UPDATE user_food_milestones
                SET total_logs = ?,
                    milestone_level = ?,
                    points_multiplier = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [newTotal, newLevel, newMultiplier, userId]);

            // Award bonus if leveled up
            if (newLevel > currentLevel) {
                await this.awardPoints(
                    userId,
                    this.POINT_REWARDS.MILESTONE_LEVEL_UP,
                    'food_milestone_level_up',
                    `Reached food logging Level ${newLevel}! Multiplier now ${newMultiplier}x`,
                    'milestone',
                    null,
                    { type: 'food', level: newLevel, multiplier: newMultiplier }
                );

                return {
                    newTotalLogs: newTotal,
                    milestone_level: newLevel,
                    multiplier: newMultiplier,
                    leveledUp: true,
                    bonus: this.POINT_REWARDS.MILESTONE_LEVEL_UP
                };
            }

            return {
                newTotalLogs: newTotal,
                milestone_level: newLevel,
                multiplier: newMultiplier,
                leveledUp: false
            };
        } catch (error) {
            console.error('Error checking food milestone:', error);
            throw error;
        }
    }

    /**
     * Update weight milestone after logging weight
     */
    static async checkWeightMilestone(userId, connection = null) {
        try {
            const executeQuery = connection ? connection.execute.bind(connection) : db.query.bind(db);

            // Get current milestone
            const [current] = await executeQuery(`
                SELECT total_logs, milestone_level, points_multiplier
                FROM user_weight_milestones
                WHERE user_id = ?
            `, [userId]);

            if (!current[0]) {
                // Initialize if doesn't exist
                await executeQuery(`
                    INSERT IGNORE INTO user_weight_milestones (user_id, total_logs, milestone_level, points_multiplier)
                    VALUES (?, 1, 1, 1.00)
                `, [userId]);
                return { newTotalLogs: 1, milestone_level: 1, multiplier: 1.0, leveledUp: false };
            }

            const newTotal = current[0].total_logs + 1;
            const currentLevel = current[0].milestone_level;

            // Find new level based on total logs
            let newLevel = currentLevel;
            let newMultiplier = current[0].points_multiplier;

            for (let i = this.WEIGHT_MILESTONE_THRESHOLDS.length - 1; i >= 0; i--) {
                if (newTotal >= this.WEIGHT_MILESTONE_THRESHOLDS[i].logs) {
                    newLevel = this.WEIGHT_MILESTONE_THRESHOLDS[i].level;
                    newMultiplier = this.WEIGHT_MILESTONE_THRESHOLDS[i].multiplier;
                    break;
                }
            }

            // Update milestone
            await executeQuery(`
                UPDATE user_weight_milestones
                SET total_logs = ?,
                    milestone_level = ?,
                    points_multiplier = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [newTotal, newLevel, newMultiplier, userId]);

            // Award bonus if leveled up
            if (newLevel > currentLevel) {
                await this.awardPoints(
                    userId,
                    this.POINT_REWARDS.MILESTONE_LEVEL_UP,
                    'weight_milestone_level_up',
                    `Reached weight logging Level ${newLevel}! Multiplier now ${newMultiplier}x`,
                    'milestone',
                    null,
                    { type: 'weight', level: newLevel, multiplier: newMultiplier }
                );

                return {
                    newTotalLogs: newTotal,
                    milestone_level: newLevel,
                    multiplier: newMultiplier,
                    leveledUp: true,
                    bonus: this.POINT_REWARDS.MILESTONE_LEVEL_UP
                };
            }

            return {
                newTotalLogs: newTotal,
                milestone_level: newLevel,
                multiplier: newMultiplier,
                leveledUp: false
            };
        } catch (error) {
            console.error('Error checking weight milestone:', error);
            throw error;
        }
    }

    /**
     * Update user streak for a specific activity (DEPRECATED - kept for backward compatibility)
     */
    static async updateStreak(userId, streakType, activityDate = null) {
        // No longer tracking streaks to avoid FOMO
        // Kept as no-op for backward compatibility
        return { success: true, message: 'Streak tracking disabled' };
    }

    // ============================================
    // ACHIEVEMENT SYSTEM
    // ============================================

    /**
     * Award achievement badge to user
     */
    static async awardAchievement(userId, achievementCode, name, description, icon = '🏆', pointsAwarded = 0) {
        try {
            // Check if already awarded
            const [existing] = await db.query(
                'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_code = ?',
                [userId, achievementCode]
            );

            if (existing[0]) {
                return { alreadyAwarded: true };
            }

            // Award achievement
            await db.query(`
                INSERT INTO user_achievements 
                (user_id, achievement_code, achievement_name, achievement_description, achievement_icon, points_awarded)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, achievementCode, name, description, icon, pointsAwarded]);

            // Award points if any
            if (pointsAwarded > 0) {
                await this.awardPoints(userId, pointsAwarded, 'achievement', `Achievement unlocked: ${name}`, 'achievement', null, { code: achievementCode });
            }

            return {
                success: true,
                achievement: { code: achievementCode, name, description, icon, pointsAwarded }
            };
        } catch (error) {
            console.error('Error awarding achievement:', error);
            throw error;
        }
    }

    // ============================================
    // QUERY METHODS
    // ============================================

    /**
     * Get user's current points and stats
     */
    static async getUserPoints(userId) {
        try {
            const points = await db.query(`
                SELECT * FROM v_user_points_summary WHERE user_id = ?
            `, [userId]);

            return points[0] || null;
        } catch (error) {
            console.error('Error getting user points:', error.message);
            throw error;
        }
    }

    /**
     * Get user's point transaction history
     */
    static async getTransactionHistory(userId, limit = 50, offset = 0) {
        try {
            const transactions = await db.query(`
                SELECT id, points, transaction_type, reason, description, reference_type, reference_id, created_at
                FROM point_transactions
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [userId, limit, offset]);

            return transactions;
        } catch (error) {
            console.error('Error getting transaction history:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard
     */
    static async getLeaderboard(limit = 100) {
        try {
            const leaderboard = await db.query(`
                SELECT * FROM v_points_leaderboard
                LIMIT ?
            `, [limit]);

            return leaderboard;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }
}

module.exports = PointsService;
