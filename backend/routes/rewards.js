const express = require('express');
const { param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const RewardsController = require('../controllers/rewardsController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================
// POINTS & STATS
// ============================================

/**
 * GET /api/rewards/points
 * Get user's current points and stats
 */
router.get('/points', RewardsController.getMyPoints);

/**
 * GET /api/rewards/transactions
 * Get points transaction history
 */
router.get('/transactions', [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    next();
}, RewardsController.getTransactionHistory);

/**
 * POST /api/rewards/daily-reward
 * Claim daily login reward
 */
router.post('/daily-reward', RewardsController.claimDailyReward);

// ============================================
// LEADERBOARD
// ============================================

/**
 * GET /api/rewards/leaderboard
 * Get points leaderboard
 */
router.get('/leaderboard', [
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be 1-500')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    next();
}, RewardsController.getLeaderboard);

// ============================================
// REWARDS SHOP
// ============================================

/**
 * GET /api/rewards/shop
 * Get all available reward items
 */
router.get('/shop', [
    query('category').optional().isIn(['theme', 'badge', 'feature', 'avatar', 'powerup', 'challenge']).withMessage('Invalid category')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    next();
}, RewardsController.getShopItems);

/**
 * POST /api/rewards/shop/:itemId/purchase
 * Purchase a reward item
 */
router.post('/shop/:itemId/purchase', [
    param('itemId').isInt({ min: 1 }).withMessage('Valid item ID required')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    next();
}, RewardsController.purchaseItem);

/**
 * GET /api/rewards/purchases
 * Get user's purchased items
 */
router.get('/purchases', RewardsController.getMyPurchases);

/**
 * POST /api/rewards/purchases/:purchaseId/equip
 * Equip/activate a purchased item
 */
router.post('/purchases/:purchaseId/equip', [
    param('purchaseId').isInt({ min: 1 }).withMessage('Valid purchase ID required')
], (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    next();
}, RewardsController.equipItem);

// ============================================
// ACHIEVEMENTS
// ============================================

/**
 * GET /api/rewards/achievements
 * Get user's achievements
 */
router.get('/achievements', RewardsController.getMyAchievements);

// ============================================
// MILESTONES
// ============================================

/**
 * GET /api/rewards/food-milestones
 * Get user's food logging milestones and multiplier
 */
router.get('/food-milestones', RewardsController.getFoodMilestones);

/**
 * GET /api/rewards/weight-milestones
 * Get user's weight logging milestones and multiplier
 */
router.get('/weight-milestones', RewardsController.getWeightMilestones);

/**
 * GET /api/rewards/streaks (DEPRECATED)
 * Get user's activity streaks - replaced with milestone system
 */
router.get('/streaks', RewardsController.getMyStreaks);

module.exports = router;
