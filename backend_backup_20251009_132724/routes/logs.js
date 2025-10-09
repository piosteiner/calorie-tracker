const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get food logs for a specific date
router.get('/', [
    query('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const date = req.query.date || new Date().toISOString().split('T')[0];
        
        // Enhanced query to support hybrid storage with meal categories
        const logs = await db.query(`
            SELECT 
                fl.id,
                COALESCE(fl.name, f.name) as food_name,
                fl.quantity,
                fl.unit,
                fl.calories,
                fl.logged_at as created_at,
                fl.logged_at as updated_at,
                fl.log_date,
                fl.meal_category,
                fl.meal_time
            FROM food_logs fl
            LEFT JOIN foods f ON fl.food_id = f.id
            WHERE fl.user_id = ? AND fl.log_date = ?
            ORDER BY fl.meal_time ASC, fl.logged_at DESC
        `, [req.user.id, date]);

        // Group logs by meal category
        const grouped = {
            breakfast: { foods: [], total_calories: 0 },
            lunch: { foods: [], total_calories: 0 },
            dinner: { foods: [], total_calories: 0 },
            snack: { foods: [], total_calories: 0 },
            other: { foods: [], total_calories: 0 }
        };

        let totalCalories = 0;
        const categoriesUsed = new Set();

        logs.forEach(log => {
            const category = log.meal_category || 'other';
            grouped[category].foods.push(log);
            grouped[category].total_calories += parseFloat(log.calories);
            totalCalories += parseFloat(log.calories);
            categoriesUsed.add(category);
        });
        
        res.json({
            success: true,
            logs,
            grouped,
            totals: {
                total_calories: totalCalories,
                meals_count: logs.length,
                categories_used: Array.from(categoriesUsed)
            },
            date
        });
    } catch (error) {
        console.error('Get food logs error:', error);
        res.status(500).json({
            error: 'Failed to retrieve food logs'
        });
    }
});

// Add food log entry
router.post('/', [
    body('foodId').optional().isInt({ min: 1 }).withMessage('Food ID must be a positive integer'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Food name must be 1-100 characters'),
    body('quantity').isFloat({ min: 0.1 }).withMessage('Quantity must be at least 0.1'),
    body('unit').trim().isLength({ min: 1, max: 20 }).withMessage('Unit is required (1-20 characters)'),
    body('calories').isInt({ min: 0 }).withMessage('Calories must be a positive whole number (kcal)'),
    body('logDate').optional().isISO8601().withMessage('Log date must be in YYYY-MM-DD format'),
    body('meal_category').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack', 'other']).withMessage('Invalid meal category'),
    body('meal_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).withMessage('Meal time must be in HH:MM:SS format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { foodId, name, quantity, unit, calories, meal_category, meal_time } = req.body;
        const logDate = req.body.logDate || new Date().toISOString().split('T')[0];
        
        // Validate log_date is not in the future
        const today = new Date().toISOString().split('T')[0];
        if (logDate > today) {
            return res.status(400).json({
                error: 'Cannot log food for future dates'
            });
        }

        const mealCategory = meal_category || 'other';
        const mealTime = meal_time || null;

        // Validate that either foodId or name is provided
        if (!foodId && !name) {
            return res.status(400).json({
                error: 'Either foodId or name must be provided'
            });
        }

        let finalFoodId = foodId;
        let foodName = name;

        // If foodId is provided, verify it exists and get the name
        if (foodId) {
            const food = await db.getFoodById(foodId);
            if (!food) {
                return res.status(404).json({
                    error: 'Food not found'
                });
            }
            foodName = food.name;
        } else {
            // If only name is provided, try to find existing food or create a custom entry
            const existingFood = await db.query('SELECT * FROM foods WHERE name = ? LIMIT 1', [name]);
            if (existingFood.length > 0) {
                finalFoodId = existingFood[0].id;
                foodName = existingFood[0].name;
            } else {
                // Create a new user-contributed food entry
                // Calculate calories per 100g from the logged data
                const caloriesPer100g = Math.round((calories / quantity) * 100);
                const newFood = await db.createFood(
                    name, 
                    caloriesPer100g, 
                    unit || '100g',
                    null, // category
                    null, // brand
                    null, // distributor
                    req.user.id, // createdBy - track user contribution
                    1 // isPublic
                );
                finalFoodId = newFood.insertId;
                foodName = name;
            }
        }

        // Create the food log entry with enhanced data
        const result = await db.query(`
            INSERT INTO food_logs (user_id, food_id, name, quantity, unit, calories, log_date, meal_category, meal_time) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, finalFoodId, foodName, quantity, unit, calories, logDate, mealCategory, mealTime]);
        
        res.status(201).json({
            success: true,
            message: `Successfully logged ${quantity}${unit} of ${foodName} (${calories} kcal)`,
            logId: result.insertId,
            entry: {
                id: result.insertId,
                foodName: foodName,
                quantity: quantity,
                unit: unit,
                calories: calories,
                logDate: logDate,
                meal_category: mealCategory,
                meal_time: mealTime
            }
        });
    } catch (error) {
        console.error('Create food log error:', error);
        res.status(500).json({
            error: 'Failed to create food log entry'
        });
    }
});

// Update food log entry
router.put('/:id', [
    param('id').isInt({ min: 1 }).withMessage('Valid log ID is required'),
    body('foodId').optional().isInt({ min: 1 }).withMessage('Food ID must be a positive integer'),
    body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Food name must be 1-100 characters'),
    body('quantity').optional().isFloat({ min: 0.1 }).withMessage('Quantity must be at least 0.1'),
    body('unit').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Unit must be 1-20 characters'),
    body('calories').optional().isInt({ min: 0 }).withMessage('Calories must be a positive whole number (kcal)'),
    body('logDate').optional().isISO8601().withMessage('Log date must be in YYYY-MM-DD format'),
    body('meal_category').optional().isIn(['breakfast', 'lunch', 'dinner', 'snack', 'other']).withMessage('Invalid meal category'),
    body('meal_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).withMessage('Meal time must be in HH:MM:SS format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { foodId, name, quantity, unit, calories, logDate, meal_category, meal_time } = req.body;

        // First, verify the log exists and belongs to the user
        const existingLog = await db.query(
            'SELECT * FROM food_logs WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existingLog.length === 0) {
            return res.status(404).json({
                error: 'Food log entry not found'
            });
        }

        // Build update query dynamically based on provided fields
        const updates = [];
        const values = [];

        if (foodId !== undefined) {
            // Verify food exists
            const food = await db.getFoodById(foodId);
            if (!food) {
                return res.status(404).json({
                    error: 'Food not found'
                });
            }
            updates.push('food_id = ?');
            values.push(foodId);
            updates.push('name = ?');
            values.push(food.name);
        } else if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
            // Try to find matching food
            const existingFood = await db.query('SELECT id FROM foods WHERE name = ? LIMIT 1', [name]);
            if (existingFood.length > 0) {
                updates.push('food_id = ?');
                values.push(existingFood[0].id);
            }
        }

        if (quantity !== undefined) {
            updates.push('quantity = ?');
            values.push(quantity);
        }

        if (unit !== undefined) {
            updates.push('unit = ?');
            values.push(unit);
        }

        if (calories !== undefined) {
            updates.push('calories = ?');
            values.push(calories);
        }

        if (logDate !== undefined) {
            // Validate log_date is not in the future
            const today = new Date().toISOString().split('T')[0];
            if (logDate > today) {
                return res.status(400).json({
                    error: 'Cannot log food for future dates'
                });
            }
            updates.push('log_date = ?');
            values.push(logDate);
        }

        if (meal_category !== undefined) {
            updates.push('meal_category = ?');
            values.push(meal_category);
        }

        if (meal_time !== undefined) {
            updates.push('meal_time = ?');
            values.push(meal_time);
        }

        // If no fields to update
        if (updates.length === 0) {
            return res.status(400).json({
                error: 'No fields to update'
            });
        }

        // Add ID and user_id to values for WHERE clause
        values.push(id);
        values.push(req.user.id);

        const sql = `UPDATE food_logs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
        await db.query(sql, values);

        // Fetch and return updated log
        const updatedLog = await db.query(
            'SELECT * FROM food_logs WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({
            success: true,
            message: `Successfully updated ${updatedLog[0].food_name || 'food entry'}`,
            log: updatedLog[0]
        });
    } catch (error) {
        console.error('Update food log error:', error);
        res.status(500).json({
            error: 'Failed to update food log entry'
        });
    }
});

// Delete food log entry
router.delete('/:id', [
    param('id').isInt({ min: 1 }).withMessage('Valid log ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const result = await db.deleteFoodLog(id, req.user.id);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Food log entry not found'
            });
        }

        res.json({
            success: true,
            message: 'Food log entry deleted'
        });
    } catch (error) {
        console.error('Delete food log error:', error);
        res.status(500).json({
            error: 'Failed to delete food log entry'
        });
    }
});

// Get daily summary
router.get('/summary', [
    query('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const date = req.query.date || new Date().toISOString().split('T')[0];
        const summary = await db.getDailySummary(req.user.id, date);
        
        res.json({
            success: true,
            summary,
            date
        });
    } catch (error) {
        console.error('Get daily summary error:', error);
        res.status(500).json({
            error: 'Failed to get daily summary'
        });
    }
});

// Get logs for a date range
router.get('/range', [
    query('start_date').isISO8601().withMessage('Start date is required in YYYY-MM-DD format'),
    query('end_date').isISO8601().withMessage('End date is required in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { start_date, end_date } = req.query;

        // Validate date range (max 90 days)
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
            return res.status(400).json({
                error: 'End date must be after start date'
            });
        }

        if (daysDiff > 90) {
            return res.status(400).json({
                error: 'Date range cannot exceed 90 days'
            });
        }

        // Get all logs for the date range
        const logs = await db.query(`
            SELECT 
                fl.id,
                COALESCE(fl.name, f.name) as food_name,
                fl.quantity,
                fl.unit,
                fl.calories,
                fl.logged_at,
                fl.log_date,
                fl.meal_category,
                fl.meal_time
            FROM food_logs fl
            LEFT JOIN foods f ON fl.food_id = f.id
            WHERE fl.user_id = ? AND fl.log_date BETWEEN ? AND ?
            ORDER BY fl.log_date DESC, fl.meal_time ASC, fl.logged_at DESC
        `, [req.user.id, start_date, end_date]);

        // Group by date
        const data = {};
        let totalDaysLogged = 0;
        let totalCaloriesAllDays = 0;

        logs.forEach(log => {
            const date = log.log_date;
            if (!data[date]) {
                data[date] = {
                    logs: [],
                    grouped: {
                        breakfast: { foods: [], total_calories: 0 },
                        lunch: { foods: [], total_calories: 0 },
                        dinner: { foods: [], total_calories: 0 },
                        snack: { foods: [], total_calories: 0 },
                        other: { foods: [], total_calories: 0 }
                    },
                    total_calories: 0
                };
                totalDaysLogged++;
            }

            const category = log.meal_category || 'other';
            data[date].logs.push(log);
            data[date].grouped[category].foods.push(log);
            data[date].grouped[category].total_calories += parseFloat(log.calories);
            data[date].total_calories += parseFloat(log.calories);
            totalCaloriesAllDays += parseFloat(log.calories);
        });

        const avgCalories = totalDaysLogged > 0 ? Math.round(totalCaloriesAllDays / totalDaysLogged) : 0;

        res.json({
            success: true,
            data,
            summary: {
                total_days: daysDiff + 1,
                days_logged: totalDaysLogged,
                average_calories: avgCalories
            }
        });
    } catch (error) {
        console.error('Get date range logs error:', error);
        res.status(500).json({
            error: 'Failed to retrieve logs for date range'
        });
    }
});

// Get calendar view for a month
router.get('/calendar', [
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('Year is required (2000-2100)'),
    query('month').isInt({ min: 1, max: 12 }).withMessage('Month is required (1-12)')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { year, month } = req.query;

        // Calculate first and last day of month
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        // Get all logs for the month
        const logs = await db.query(`
            SELECT 
                fl.log_date,
                COUNT(*) as meals_count,
                SUM(fl.calories) as total_calories
            FROM food_logs fl
            WHERE fl.user_id = ? AND fl.log_date BETWEEN ? AND ?
            GROUP BY fl.log_date
        `, [req.user.id, firstDay, lastDayStr]);

        // Get weight logs for the month
        const weightLogs = await db.query(`
            SELECT log_date
            FROM weight_logs
            WHERE user_id = ? AND log_date BETWEEN ? AND ?
        `, [req.user.id, firstDay, lastDayStr]);

        const weightLogDates = new Set(weightLogs.map(w => w.log_date));

        // Get user's daily calorie goal
        const user = await db.getUserById(req.user.id);
        const dailyGoal = user.daily_calorie_goal || 2000;

        // Create calendar array with all days
        const calendar = [];
        for (let day = 1; day <= lastDay; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const logData = logs.find(l => l.log_date === dateStr);
            
            calendar.push({
                date: dateStr,
                total_calories: logData ? parseInt(logData.total_calories) : 0,
                meals_count: logData ? parseInt(logData.meals_count) : 0,
                goal_met: logData ? parseInt(logData.total_calories) >= dailyGoal : false,
                has_weight_log: weightLogDates.has(dateStr)
            });
        }

        res.json({
            success: true,
            calendar
        });
    } catch (error) {
        console.error('Get calendar view error:', error);
        res.status(500).json({
            error: 'Failed to retrieve calendar view'
        });
    }
});

// Get weekly summary
router.get('/weekly', [
    query('startDate').optional().isISO8601().withMessage('Start date must be in YYYY-MM-DD format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
        const startDate = req.query.startDate || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const weeklyData = await db.getWeeklySummary(req.user.id, startDate, endDate);
        
        res.json({
            success: true,
            period: { startDate, endDate },
            weeklyData
        });
    } catch (error) {
        console.error('Get weekly summary error:', error);
        res.status(500).json({
            error: 'Failed to get weekly summary'
        });
    }
});

// Get food log history (all days with logs)
router.get('/history', [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a positive integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const limit = parseInt(req.query.limit) || 30; // Default 30 days
        const offset = parseInt(req.query.offset) || 0;

        // Get all dates with logs, grouped by date with summaries
        // Includes per-day goals from daily_goals table with fallback to user's default goal
        const history = await db.query(`
            SELECT 
                fl.log_date,
                COUNT(*) as meals_count,
                SUM(fl.calories) as total_calories,
                MIN(fl.logged_at) as first_log_time,
                MAX(fl.logged_at) as last_log_time,
                COALESCE(dg.goal_calories, u.daily_calorie_goal) as daily_goal
            FROM food_logs fl
            LEFT JOIN daily_goals dg ON fl.user_id = dg.user_id AND fl.log_date = dg.goal_date
            LEFT JOIN users u ON fl.user_id = u.id
            WHERE fl.user_id = ?
            GROUP BY fl.log_date, dg.goal_calories, u.daily_calorie_goal
            ORDER BY fl.log_date DESC
            LIMIT ${limit} OFFSET ${offset}
        `, [req.user.id]);

        // Get total count of days with logs
        const totalDaysResult = await db.query(`
            SELECT COUNT(DISTINCT log_date) as total_days
            FROM food_logs 
            WHERE user_id = ?
        `, [req.user.id]);

        const totalDays = totalDaysResult[0].total_days;

        res.json({
            success: true,
            history,
            pagination: {
                limit,
                offset,
                totalDays,
                hasMore: (offset + limit) < totalDays
            }
        });
    } catch (error) {
        console.error('Get food log history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve food log history'
        });
    }
});

// Get all unique dates with logs (for calendar view)
router.get('/dates', [
    query('startDate').optional().isISO8601().withMessage('Start date must be in YYYY-MM-DD format'),
    query('endDate').optional().isISO8601().withMessage('End date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        // Default to last 90 days if no dates provided
        const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
        const startDate = req.query.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Get all dates with at least one log entry
        const dates = await db.query(`
            SELECT 
                log_date,
                COUNT(*) as meals_count,
                SUM(calories) as total_calories
            FROM food_logs 
            WHERE user_id = ? AND log_date BETWEEN ? AND ?
            GROUP BY log_date
            ORDER BY log_date DESC
        `, [req.user.id, startDate, endDate]);

        res.json({
            success: true,
            dates,
            period: { startDate, endDate }
        });
    } catch (error) {
        console.error('Get food log dates error:', error);
        res.status(500).json({
            error: 'Failed to retrieve food log dates'
        });
    }
});

module.exports = router;