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
        
        // Enhanced query to support hybrid storage
        const logs = await db.query(`
            SELECT 
                fl.id,
                COALESCE(fl.name, f.name) as food_name,
                fl.quantity,
                fl.unit,
                fl.calories,
                fl.logged_at as created_at,
                fl.logged_at as updated_at,
                fl.log_date
            FROM food_logs fl
            LEFT JOIN foods f ON fl.food_id = f.id
            WHERE fl.user_id = ? AND fl.log_date = ?
            ORDER BY fl.logged_at DESC
        `, [req.user.id, date]);

        // Calculate total calories for the day
        const totalCalories = logs.reduce((sum, log) => sum + parseFloat(log.calories), 0);
        
        res.json({
            success: true,
            logs,
            totalCalories,
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
    body('calories').isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
    body('logDate').optional().isISO8601().withMessage('Log date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { foodId, name, quantity, unit, calories } = req.body;
        const logDate = req.body.logDate || new Date().toISOString().split('T')[0];

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
            } else {
                // For hybrid storage, we'll use a null foodId and store the name directly
                finalFoodId = null;
            }
        }

        // Create the food log entry with enhanced data
        const result = await db.query(`
            INSERT INTO food_logs (user_id, food_id, name, quantity, unit, calories, log_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, finalFoodId, foodName, quantity, unit, calories, logDate]);
        
        res.status(201).json({
            success: true,
            message: `Successfully logged ${quantity}${unit} of ${foodName} (${calories} cal)`,
            logId: result.insertId,
            entry: {
                id: result.insertId,
                foodName: foodName,
                quantity: quantity,
                unit: unit,
                calories: calories,
                logDate: logDate
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
    body('calories').optional().isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
    body('logDate').optional().isISO8601().withMessage('Log date must be in YYYY-MM-DD format')
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
        const { foodId, name, quantity, unit, calories, logDate } = req.body;

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
            updates.push('log_date = ?');
            values.push(logDate);
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
        const history = await db.query(`
            SELECT 
                log_date,
                COUNT(*) as meals_count,
                SUM(calories) as total_calories,
                MIN(logged_at) as first_log_time,
                MAX(logged_at) as last_log_time
            FROM food_logs 
            WHERE user_id = ?
            GROUP BY log_date
            ORDER BY log_date DESC
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