const express = require('express');
const { body, query, validationResult } = require('express-validator');
const externalFoodsController = require('../controllers/externalFoodsController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// Rate limiting for unauthenticated users
const rateLimit = require('express-rate-limit');
const unauthenticatedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit unauthenticated users to 20 requests per window
    skip: (req) => req.user && req.user.id, // Skip rate limiting for authenticated users
    message: {
        success: false,
        message: 'Too many requests. Please log in for unlimited access.',
        rateLimited: true
    },
    trustProxy: true
});

// Search external foods (public endpoint for food search)
router.get('/search', [
    query('q')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2-100 characters'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Limit must be between 1-10'), // Reduced limit for unauthenticated users
    query('source')
        .optional()
        .isIn(['openfoodfacts'])
        .withMessage('Invalid source')
], optionalAuth, unauthenticatedLimiter, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await externalFoodsController.searchExternalFoods(req, res);
    } catch (error) {
        console.error('External foods search route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get external food details by ID
router.get('/details/:id', [
    query('source')
        .optional()
        .isIn(['openfoodfacts'])
        .withMessage('Invalid source')
], authenticateToken, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await externalFoodsController.getExternalFoodDetails(req, res);
    } catch (error) {
        console.error('External food details route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Log external food consumption (allows unauthenticated for local logging)
router.post('/log', [
    body('external_food_id')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('External food ID is required (1-100 characters)'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Food name is required (1-255 characters)'),
    body('quantity')
        .isFloat({ min: 0.01 })
        .withMessage('Quantity must be a positive number'),
    body('unit')
        .optional()
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage('Unit must be 1-10 characters'),
    body('calories')
        .isFloat({ min: 0 })
        .withMessage('Calories must be a non-negative number'),
    body('brand')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Brand must be max 255 characters'),
    body('protein_per_100g')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Protein must be a non-negative number'),
    body('carbs_per_100g')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Carbs must be a non-negative number'),
    body('fat_per_100g')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Fat must be a non-negative number'),
    body('fiber_per_100g')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Fiber must be a non-negative number'),
    body('source')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Source must be 1-100 characters'),
    body('log_date')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Log date must be a valid date')
], optionalAuth, unauthenticatedLimiter, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        await externalFoodsController.logExternalFood(req, res);
    } catch (error) {
        console.error('External food logging route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Health check for external services
router.get('/health', authenticateToken, async (req, res) => {
    try {
        await externalFoodsController.healthCheck(req, res);
    } catch (error) {
        console.error('External services health check route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Admin routes
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await externalFoodsController.getExternalFoodStats(req, res);
    } catch (error) {
        console.error('External food stats route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;