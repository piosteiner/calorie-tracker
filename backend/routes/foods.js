const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../database');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

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
    body('distributor').optional().trim().isLength({ max: 100 }).withMessage('Distributor must be max 100 characters'),
    body('protein_per_100g').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Protein must be a positive number (g)'),
    body('carbs_per_100g').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Carbohydrates must be a positive number (g)'),
    body('fat_per_100g').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Fat must be a positive number (g)')
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, caloriesPerUnit, defaultUnit, category, brand, distributor,
                protein_per_100g, carbs_per_100g, fat_per_100g } = req.body;
        const userId = req.user ? req.user.id : null; // Track who created it
        const result = await db.createFood(name, caloriesPerUnit, defaultUnit, category, brand, distributor, userId, 1, protein_per_100g ?? null, carbs_per_100g ?? null, fat_per_100g ?? null);
        
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

// Delete food — admin can delete any food, regular users cannot
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const foodId = parseInt(req.params.id, 10);
        if (!foodId || foodId < 1) {
            return res.status(400).json({ success: false, message: 'Invalid food ID' });
        }

        // Fetch user role from DB to enforce admin check server-side
        const user = await db.getUserById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin privileges required to delete foods' });
        }

        // Detach food from any logs before deleting (preserves log history)
        await db.query('UPDATE food_logs SET food_id = NULL WHERE food_id = ?', [foodId]);

        const result = await db.query('DELETE FROM foods WHERE id = ?', [foodId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Food not found' });
        }

        res.json({ success: true, message: 'Food deleted successfully' });
    } catch (error) {
        console.error('Delete food error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete food' });
    }
});

module.exports = router;