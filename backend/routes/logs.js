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
                COALESCE(fl.food_name, f.name) as food_name,
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
            INSERT INTO food_logs (user_id, food_id, food_name, quantity, unit, calories, log_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, finalFoodId, foodName, quantity, unit, calories, logDate]);
        
        res.status(201).json({
            success: true,
            message: 'Food log entry created',
            logId: result.insertId
        });
    } catch (error) {
        console.error('Create food log error:', error);
        res.status(500).json({
            error: 'Failed to create food log entry'
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

module.exports = router;