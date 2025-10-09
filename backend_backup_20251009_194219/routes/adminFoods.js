const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const adminFoodsController = require('../controllers/adminFoodsController');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Get all foods with filtering and pagination
router.get('/foods', [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('category').optional().trim().isLength({ max: 100 }),
    query('source').optional().isIn(['custom', 'imported', 'system']),
    query('search').optional().trim().isLength({ max: 100 })
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await adminFoodsController.getAllFoods(req, res);
    } catch (error) {
        console.error('Pios Food DB route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create new food
router.post('/foods', [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
    body('calories_per_100g').isInt({ min: 0 }).withMessage('Calories per 100g must be a positive whole number (kcal)'),
    // default_unit is automatically set to '100g' in the controller
    body('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand must be max 100 characters'),
    body('distributor').optional().trim().isLength({ max: 100 }).withMessage('Distributor must be max 100 characters'),
    body('protein_per_100g').optional().isFloat({ min: 0 }).withMessage('Protein must be a positive number'),
    body('carbs_per_100g').optional().isFloat({ min: 0 }).withMessage('Carbs must be a positive number'),
    body('fat_per_100g').optional().isFloat({ min: 0 }).withMessage('Fat must be a positive number'),
    body('fiber_per_100g').optional().isFloat({ min: 0 }).withMessage('Fiber must be a positive number'),
    body('sodium_per_100g').optional().isFloat({ min: 0 }).withMessage('Sodium must be a positive number'),
    body('sugar_per_100g').optional().isFloat({ min: 0 }).withMessage('Sugar must be a positive number'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
    body('barcode').optional().trim().isLength({ max: 50 }).withMessage('Barcode must be max 50 characters'),
    body('is_verified').optional().isBoolean().withMessage('is_verified must be a boolean')
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await adminFoodsController.createFood(req, res);
    } catch (error) {
        console.error('Pios Food DB create route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update food
router.put('/foods/:foodId', [
    param('foodId').isInt({ min: 1 }).withMessage('Food ID must be a positive integer'),
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
    body('calories_per_100g').isInt({ min: 0 }).withMessage('Calories per 100g must be a positive whole number (kcal)'),
    // default_unit is automatically set to '100g' in the controller
    body('category_id').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand must be max 100 characters'),
    body('distributor').optional().trim().isLength({ max: 100 }).withMessage('Distributor must be max 100 characters'),
    body('protein_per_100g').optional().isFloat({ min: 0 }).withMessage('Protein must be a positive number'),
    body('carbs_per_100g').optional().isFloat({ min: 0 }).withMessage('Carbs must be a positive number'),
    body('fat_per_100g').optional().isFloat({ min: 0 }).withMessage('Fat must be a positive number'),
    body('fiber_per_100g').optional().isFloat({ min: 0 }).withMessage('Fiber must be a positive number'),
    body('sodium_per_100g').optional().isFloat({ min: 0 }).withMessage('Sodium must be a positive number'),
    body('sugar_per_100g').optional().isFloat({ min: 0 }).withMessage('Sugar must be a positive number'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
    body('barcode').optional().trim().isLength({ max: 50 }).withMessage('Barcode must be max 50 characters'),
    body('is_verified').optional().isBoolean().withMessage('is_verified must be a boolean')
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await adminFoodsController.updateFood(req, res);
    } catch (error) {
        console.error('Pios Food DB update route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete food
router.delete('/foods/:foodId', [
    param('foodId').isInt({ min: 1 }).withMessage('Food ID must be a positive integer')
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await adminFoodsController.deleteFood(req, res);
    } catch (error) {
        console.error('Pios Food DB delete route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get food categories
router.get('/categories', requireAdmin, async (req, res) => {
    try {
        await adminFoodsController.getCategories(req, res);
    } catch (error) {
        console.error('Pios Food DB categories route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Import foods from file
router.post('/foods/import', 
    requireAdmin, 
    adminFoodsController.getUploadMiddleware(), 
    async (req, res) => {
        try {
            await adminFoodsController.importFoods(req, res);
        } catch (error) {
            console.error('Pios Food DB import route error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
);

// Get import history
router.get('/imports', requireAdmin, async (req, res) => {
    try {
        await adminFoodsController.getImportHistory(req, res);
    } catch (error) {
        console.error('Pios Food DB import history route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;