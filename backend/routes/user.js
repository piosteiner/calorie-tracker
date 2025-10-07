const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req, res) => {
    try {
        const user = await db.getUserById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                dailyCalorieGoal: user.daily_calorie_goal,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Failed to get user profile'
        });
    }
});

// Update user profile
router.put('/profile', [
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('dailyCalorieGoal').optional().isInt({ min: 1000, max: 5000 }).withMessage('Daily calorie goal must be between 1000-5000')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const updates = {};
        const { email, dailyCalorieGoal } = req.body;

        if (email !== undefined) updates.email = email;
        if (dailyCalorieGoal !== undefined) updates.daily_calorie_goal = dailyCalorieGoal;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update'
            });
        }

        // Build dynamic SQL query
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(req.user.id);

        const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
        await db.query(sql, values);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Failed to update profile'
        });
    }
});

// Get user statistics
router.get('/stats', async (req, res) => {
    try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 30 days

        const monthlyData = await db.getWeeklySummary(req.user.id, startDate, endDate);
        
        // Calculate statistics
        const totalDays = monthlyData.length;
        const totalCalories = monthlyData.reduce((sum, day) => sum + (day.total_calories || 0), 0);
        const totalMeals = monthlyData.reduce((sum, day) => sum + (day.meals_count || 0), 0);
        const averageCaloriesPerDay = totalDays > 0 ? Math.round(totalCalories / totalDays) : 0;
        const averageMealsPerDay = totalDays > 0 ? Math.round((totalMeals / totalDays) * 10) / 10 : 0;

        // Goal achievement stats
        const daysWithGoalMet = monthlyData.filter(day => 
            day.total_calories >= (req.user.dailyCalorieGoal * 0.9) && 
            day.total_calories <= (req.user.dailyCalorieGoal * 1.1)
        ).length;
        const goalAchievementRate = totalDays > 0 ? Math.round((daysWithGoalMet / totalDays) * 100) : 0;

        res.json({
            success: true,
            stats: {
                period: { startDate, endDate },
                totalDays,
                totalCalories,
                totalMeals,
                averageCaloriesPerDay,
                averageMealsPerDay,
                dailyGoal: req.user.dailyCalorieGoal,
                daysWithGoalMet,
                goalAchievementRate,
                dailyData: monthlyData
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Failed to get user statistics'
        });
    }
});

// Update daily calorie goal (specific endpoint for frontend)
router.put('/goal', [
    body('dailyCalorieGoal').isInt({ min: 1000, max: 5000 }).withMessage('Daily calorie goal must be between 1000-5000')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { dailyCalorieGoal } = req.body;

        await db.query(
            'UPDATE users SET daily_calorie_goal = ? WHERE id = ?',
            [dailyCalorieGoal, req.user.id]
        );

        res.json({
            success: true,
            message: 'Daily calorie goal updated',
            dailyCalorieGoal
        });
    } catch (error) {
        console.error('Update calorie goal error:', error);
        res.status(500).json({
            error: 'Failed to update daily calorie goal'
        });
    }
});

// Set daily calorie goal for specific date (per-day goals)
router.post('/daily-goal', [
    body('date').isISO8601().toDate().withMessage('Valid date is required'),
    body('goal').isInt({ min: 500, max: 10000 }).withMessage('Goal must be between 500-10000 calories')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { date, goal } = req.body;
        const userId = req.user.id;

        // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert behavior
        await db.query(`
            INSERT INTO daily_goals (user_id, goal_date, goal_calories) 
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                goal_calories = VALUES(goal_calories),
                updated_at = CURRENT_TIMESTAMP
        `, [userId, date, goal]);

        res.json({
            success: true,
            message: `Daily goal for ${date} saved successfully`,
            goal,
            date
        });
    } catch (error) {
        console.error('Save daily goal error:', error);
        res.status(500).json({
            error: 'Failed to save daily goal',
            details: error.message
        });
    }
});

// Get daily calorie goal for specific date
router.get('/daily-goal/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const userId = req.user.id;

        // Get specific daily goal or fall back to user's default goal
        // Using UNION ALL to get either the specific goal or the default
        const dailyGoal = await db.query(`
            SELECT dg.goal_calories as daily_goal, 'specific' as source
            FROM daily_goals dg 
            WHERE dg.user_id = ? AND dg.goal_date = ?
            UNION ALL
            SELECT u.daily_calorie_goal as daily_goal, 'default' as source
            FROM users u 
            WHERE u.id = ? AND NOT EXISTS (
                SELECT 1 FROM daily_goals WHERE user_id = ? AND goal_date = ?
            )
            LIMIT 1
        `, [userId, date, userId, userId, date]);

        const goal = dailyGoal.length > 0 ? dailyGoal[0].daily_goal : 2000;
        const source = dailyGoal.length > 0 ? dailyGoal[0].source : 'fallback';

        res.json({
            success: true,
            goal,
            date,
            source // 'specific', 'default', or 'fallback'
        });
    } catch (error) {
        console.error('Get daily goal error:', error);
        res.status(500).json({
            error: 'Failed to get daily goal'
        });
    }
});

module.exports = router;