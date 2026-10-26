// =====================================================
// USER-CONTRIBUTED FOODS ROUTES
// =====================================================
// Admin routes for managing user-contributed foods
// and growing "Pios Food DB"
// =====================================================

const express = require('express');
const router = express.Router();
const userFoodsController = require('../controllers/userFoodsController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/user-foods
 * @desc    Get all user-contributed foods pending review
 * @access  Admin
 * @query   page, limit, sortBy (popularity|recent|alphabetical), minUsage
 */
router.get('/', userFoodsController.getUserContributedFoods);

/**
 * @route   GET /api/admin/user-foods/stats
 * @desc    Get statistics about user contributions
 * @access  Admin
 */
router.get('/stats', userFoodsController.getStats);

/**
 * @route   POST /api/admin/user-foods/:id/promote
 * @desc    Promote a user food to Pios Food DB
 * @access  Admin
 * @body    { editedData: {...}, notes: "..." }
 */
router.post('/:id/promote', userFoodsController.promoteFood);

/**
 * @route   POST /api/admin/user-foods/:id/reject
 * @desc    Reject a user-contributed food
 * @access  Admin
 * @body    { reason: "..." }
 */
router.post('/:id/reject', userFoodsController.rejectFood);

/**
 * @route   DELETE /api/admin/user-foods/:id
 * @desc    Delete a user-contributed food (only if not used)
 * @access  Admin
 */
router.delete('/:id', userFoodsController.deleteUserFood);

/**
 * @route   GET /api/admin/pios-food-db
 * @desc    Get all verified foods in Pios Food DB
 * @access  Admin
 * @query   page, limit, search
 */
router.get('/pios-food-db', userFoodsController.getPiosFoodDb);

module.exports = router;
