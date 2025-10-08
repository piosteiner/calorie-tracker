const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all foods
router.get('/', optionalAuth, async (req, res) => {
    try {
        const foods = await db.getAllFoods();
        res.json({
            success: true,
            foods
        });
    } catch (error) {
        console.error('Get foods error:', error);
        res.status(500).json({
            error: 'Failed to retrieve foods'
        });
    }
});

// Search foods
router.get('/search', [
    query('q').trim().isLength({ min: 1 }).withMessage('Search query is required')
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { q: searchTerm } = req.query;
        const foods = await db.searchFoods(searchTerm);
        
        res.json({
            success: true,
            foods,
            query: searchTerm
        });
    } catch (error) {
        console.error('Search foods error:', error);
        res.status(500).json({
            error: 'Search failed'
        });
    }
});

// Get food by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const food = await db.getFoodById(id);
        
        if (!food) {
            return res.status(404).json({
                error: 'Food not found'
            });
        }

        res.json({
            success: true,
            food
        });
    } catch (error) {
        console.error('Get food error:', error);
        res.status(500).json({
            error: 'Failed to retrieve food'
        });
    }
});

// Create new food (admin function - in future could be restricted)
router.post('/', [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Food name is required (1-100 characters)'),
    body('caloriesPerUnit').isInt({ min: 0 }).withMessage('Calories per unit must be a positive whole number (kcal)'),
    body('defaultUnit').trim().isLength({ min: 1, max: 20 }).withMessage('Default unit is required (1-20 characters)'),
    body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be max 50 characters'),
    body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand must be max 100 characters'),
    body('distributor').optional().trim().isLength({ max: 100 }).withMessage('Distributor must be max 100 characters')
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, caloriesPerUnit, defaultUnit, category, brand, distributor } = req.body;
        const userId = req.user ? req.user.id : null; // Track who created it
        const result = await db.createFood(name, caloriesPerUnit, defaultUnit, category, brand, distributor, userId);
        
        res.status(201).json({
            success: true,
            message: 'Food created successfully',
            foodId: result.insertId,
            contributedToDatabase: userId ? true : false // Let user know they contributed
        });
    } catch (error) {
        console.error('Create food error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({
                error: 'Food with this name already exists'
            });
        } else {
            res.status(500).json({
                error: 'Failed to create food'
            });
        }
    }
});

module.exports = router;