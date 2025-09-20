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

module.exports = router;