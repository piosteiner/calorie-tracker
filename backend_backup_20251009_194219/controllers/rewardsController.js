const db = require('../database');
const PointsService = require('../services/pointsService');

/**
 * Rewards Controller
 * Handles rewards shop, purchases, points display, and leaderboard
 */

class RewardsController {
    
    // ============================================
    // POINTS & STATS
    // ============================================

    /**
     * Get user's current points and stats
     */
    static async getMyPoints(req, res) {
        try {
            console.log('🔍 [getMyPoints] Fetching points for user ID:', req.user.id);
            const points = await PointsService.getUserPoints(req.user.id);
            console.log('🔍 [getMyPoints] Retrieved points from PointsService:', points);
            
            if (!points) {
                console.log('⚠️ [getMyPoints] No points found, initializing for user:', req.user.id);
                // Initialize points for new user
                await PointsService.initializeUserPoints(req.user.id);
                const newPoints = await PointsService.getUserPoints(req.user.id);
                
                // Get milestones for new user
                const foodMilestone = await PointsService.getFoodMilestone(req.user.id);
                const weightMilestone = await PointsService.getWeightMilestone(req.user.id);
                
                return res.json({ 
                    success: true, 
                    points: {
                        currentPoints: newPoints.current_points,
                        lifetimePoints: newPoints.lifetime_points,
                        pointsSpent: newPoints.points_spent,
                        level: newPoints.level,
                        currentStreak: newPoints.current_streak,
                        longestStreak: newPoints.longest_streak,
                        lastActivityDate: newPoints.last_activity_date,
                        achievementsCount: newPoints.achievements_count,
                        itemsOwned: newPoints.items_owned,
                        foodMilestone: foodMilestone ? {
                            level: foodMilestone.milestone_level,
                            multiplier: parseFloat(foodMilestone.points_multiplier),
                            currentCount: foodMilestone.total_logs
                        } : null,
                        weightMilestone: weightMilestone ? {
                            level: weightMilestone.milestone_level,
                            multiplier: parseFloat(weightMilestone.points_multiplier),
                            currentCount: weightMilestone.total_logs
                        } : null
                    }
                });
            }

            // Get milestones
            const foodMilestone = await PointsService.getFoodMilestone(req.user.id);
            const weightMilestone = await PointsService.getWeightMilestone(req.user.id);
            
            console.log('🔍 [getMyPoints] Food milestone:', foodMilestone);
            console.log('🔍 [getMyPoints] Weight milestone:', weightMilestone);

            const response = { 
                success: true, 
                points: {
                    currentPoints: points.current_points,
                    lifetimePoints: points.lifetime_points,
                    pointsSpent: points.points_spent,
                    level: points.level,
                    currentStreak: points.current_streak,
                    longestStreak: points.longest_streak,
                    lastActivityDate: points.last_activity_date,
                    achievementsCount: points.achievements_count,
                    itemsOwned: points.items_owned,
                    foodMilestone: foodMilestone ? {
                        level: foodMilestone.milestone_level,
                        multiplier: parseFloat(foodMilestone.points_multiplier),
                        currentCount: foodMilestone.total_logs
                    } : null,
                    weightMilestone: weightMilestone ? {
                        level: weightMilestone.milestone_level,
                        multiplier: parseFloat(weightMilestone.points_multiplier),
                        currentCount: weightMilestone.total_logs
                    } : null
                }
            };
            
            console.log('✅ [getMyPoints] Sending response:', JSON.stringify(response, null, 2));
            res.json(response);
        } catch (error) {
            console.error('Get my points error:', error.message);
            console.error('Stack trace:', error.stack);
            res.status(500).json({ success: false, error: 'Failed to retrieve points' });
        }
    }

    /**
     * Get points transaction history
     */
    static async getTransactionHistory(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            const transactions = await PointsService.getTransactionHistory(req.user.id, limit, offset);

            const [total] = await db.query(
                'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?',
                [req.user.id]
            );

            res.json({
                success: true,
                transactions,
                pagination: {
                    limit,
                    offset,
                    total: total[0].total,
                    hasMore: offset + limit < total[0].total
                }
            });
        } catch (error) {
            console.error('Get transaction history error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve transaction history' });
        }
    }

    /**
     * Claim daily login reward
     */
    static async claimDailyReward(req, res) {
        try {
            const result = await PointsService.awardDailyLogin(req.user.id);

            if (result.alreadyClaimed) {
                return res.status(400).json({
                    success: false,
                    error: 'Daily reward already claimed today',
                    nextRewardAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });
            }

            res.json({
                success: true,
                message: `You earned ${result.pointsAwarded} points for logging in today!`,
                pointsAwarded: result.pointsAwarded
            });
        } catch (error) {
            console.error('Claim daily reward error:', error);
            res.status(500).json({ success: false, error: 'Failed to claim daily reward' });
        }
    }

    // ============================================
    // LEADERBOARD
    // ============================================

    /**
     * Get points leaderboard
     */
    static async getLeaderboard(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const leaderboard = await PointsService.getLeaderboard(limit);

            // Find current user's rank
            const userRank = leaderboard.find(entry => entry.user_id === req.user.id);

            res.json({
                success: true,
                leaderboard,
                myRank: userRank || null
            });
        } catch (error) {
            console.error('Get leaderboard error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve leaderboard' });
        }
    }

    // ============================================
    // REWARDS SHOP
    // ============================================

    /**
     * Get all available reward items
     */
    static async getShopItems(req, res) {
        try {
            const category = req.query.category;
            
            let query = `
                SELECT 
                    id, name, description, category, cost_points, item_data,
                    is_limited_edition, stock_quantity, purchase_limit, required_level,
                    (SELECT COUNT(*) FROM user_purchases WHERE item_id = reward_items.id AND user_id = ?) as user_purchase_count
                FROM reward_items
                WHERE is_active = TRUE
            `;
            
            const params = [req.user.id];

            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }

            query += ' ORDER BY display_order, cost_points';

            const items = await db.query(query, params);

            // Get user's level
            const userPoints = await PointsService.getUserPoints(req.user.id);
            const userLevel = userPoints ? userPoints.level : 1;

            // Mark items as purchasable
            const enrichedItems = items.map(item => ({
                ...item,
                item_data: item.item_data ? JSON.parse(item.item_data) : null,
                can_purchase: (
                    item.required_level <= userLevel &&
                    (item.purchase_limit === null || item.user_purchase_count < item.purchase_limit) &&
                    (item.stock_quantity === null || item.stock_quantity > 0)
                ),
                already_owned: item.user_purchase_count > 0
            }));

            res.json({
                success: true,
                items: enrichedItems,
                userLevel
            });
        } catch (error) {
            console.error('Get shop items error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve shop items' });
        }
    }

    /**
     * Purchase a reward item
     */
    static async purchaseItem(req, res) {
        try {
            const { itemId } = req.params;

            // Get item details
            const [item] = await db.query(
                'SELECT * FROM reward_items WHERE id = ? AND is_active = TRUE',
                [itemId]
            );

            if (!item[0]) {
                return res.status(404).json({ success: false, error: 'Item not found' });
            }

            const rewardItem = item[0];

            // Check if user already owns it (for single-purchase items)
            const [existingPurchase] = await db.query(
                'SELECT COUNT(*) as count FROM user_purchases WHERE user_id = ? AND item_id = ?',
                [req.user.id, itemId]
            );

            if (rewardItem.purchase_limit && existingPurchase[0].count >= rewardItem.purchase_limit) {
                return res.status(400).json({ success: false, error: 'Purchase limit reached for this item' });
            }

            // Check stock
            if (rewardItem.stock_quantity !== null && rewardItem.stock_quantity <= 0) {
                return res.status(400).json({ success: false, error: 'Item out of stock' });
            }

            // Check user level
            const userPoints = await PointsService.getUserPoints(req.user.id);
            if (userPoints.level < rewardItem.required_level) {
                return res.status(400).json({
                    success: false,
                    error: `Requires level ${rewardItem.required_level}`,
                    currentLevel: userPoints.level
                });
            }

            // Check if user has enough points
            if (userPoints.current_points < rewardItem.cost_points) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient points',
                    required: rewardItem.cost_points,
                    current: userPoints.current_points
                });
            }

            // Process purchase
            const spendResult = await PointsService.spendPoints(
                req.user.id,
                rewardItem.cost_points,
                'purchase',
                `Purchased: ${rewardItem.name}`,
                'reward_item',
                itemId
            );

            // Create purchase record
            const expiresAt = rewardItem.item_data && JSON.parse(rewardItem.item_data).duration_hours
                ? new Date(Date.now() + JSON.parse(rewardItem.item_data).duration_hours * 60 * 60 * 1000)
                : null;

            await db.query(`
                INSERT INTO user_purchases (user_id, item_id, points_paid, expires_at)
                VALUES (?, ?, ?, ?)
            `, [req.user.id, itemId, rewardItem.cost_points, expiresAt]);

            // Decrease stock if limited
            if (rewardItem.stock_quantity !== null) {
                await db.query(
                    'UPDATE reward_items SET stock_quantity = stock_quantity - 1 WHERE id = ?',
                    [itemId]
                );
            }

            res.json({
                success: true,
                message: `Successfully purchased ${rewardItem.name}!`,
                item: {
                    id: rewardItem.id,
                    name: rewardItem.name,
                    category: rewardItem.category
                },
                pointsSpent: rewardItem.cost_points,
                remainingPoints: spendResult.remainingPoints
            });
        } catch (error) {
            console.error('Purchase item error:', error);
            if (error.message === 'Insufficient points') {
                return res.status(400).json({ success: false, error: 'Insufficient points' });
            }
            res.status(500).json({ success: false, error: 'Failed to purchase item' });
        }
    }

    /**
     * Get user's purchased items
     */
    static async getMyPurchases(req, res) {
        try {
            const purchases = await db.query(`
                SELECT 
                    up.id,
                    up.purchased_at,
                    up.is_active,
                    up.is_equipped,
                    up.expires_at,
                    ri.name,
                    ri.description,
                    ri.category,
                    ri.item_data
                FROM user_purchases up
                JOIN reward_items ri ON up.item_id = ri.id
                WHERE up.user_id = ?
                ORDER BY up.purchased_at DESC
            `, [req.user.id]);

            const enrichedPurchases = purchases.map(p => ({
                ...p,
                item_data: p.item_data ? JSON.parse(p.item_data) : null,
                is_expired: p.expires_at && new Date(p.expires_at) < new Date()
            }));

            res.json({
                success: true,
                purchases: enrichedPurchases
            });
        } catch (error) {
            console.error('Get my purchases error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve purchases' });
        }
    }

    /**
     * Equip/activate a purchased item
     */
    static async equipItem(req, res) {
        try {
            const { purchaseId } = req.params;

            // Verify ownership
            const [purchase] = await db.query(`
                SELECT up.*, ri.category
                FROM user_purchases up
                JOIN reward_items ri ON up.item_id = ri.id
                WHERE up.id = ? AND up.user_id = ?
            `, [purchaseId, req.user.id]);

            if (!purchase[0]) {
                return res.status(404).json({ success: false, error: 'Purchase not found' });
            }

            // For themes/avatars, unequip all others in same category
            if (['theme', 'avatar'].includes(purchase[0].category)) {
                await db.query(`
                    UPDATE user_purchases up
                    JOIN reward_items ri ON up.item_id = ri.id
                    SET up.is_equipped = FALSE
                    WHERE up.user_id = ? AND ri.category = ?
                `, [req.user.id, purchase[0].category]);
            }

            // Equip this item
            await db.query(
                'UPDATE user_purchases SET is_equipped = TRUE WHERE id = ?',
                [purchaseId]
            );

            res.json({
                success: true,
                message: 'Item equipped successfully'
            });
        } catch (error) {
            console.error('Equip item error:', error);
            res.status(500).json({ success: false, error: 'Failed to equip item' });
        }
    }

    // ============================================
    // ACHIEVEMENTS
    // ============================================

    /**
     * Get user's achievements
     */
    static async getMyAchievements(req, res) {
        try {
            const achievements = await db.query(`
                SELECT *
                FROM user_achievements
                WHERE user_id = ?
                ORDER BY unlocked_at DESC
            `, [req.user.id]);

            res.json({
                success: true,
                achievements,
                totalAchievements: achievements.length
            });
        } catch (error) {
            console.error('Get achievements error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve achievements' });
        }
    }

    // ============================================
    // MILESTONES
    // ============================================

    /**
     * Get user's food logging milestones
     */
    static async getFoodMilestones(req, res) {
        try {
            const milestone = await PointsService.getFoodMilestone(req.user.id);

            // Find next milestone
            const nextMilestone = PointsService.FOOD_MILESTONE_THRESHOLDS.find(
                m => m.logs > milestone.total_logs
            );

            res.json({
                success: true,
                milestone: {
                    total_logs: milestone.total_logs,
                    current_level: milestone.milestone_level,
                    current_multiplier: milestone.points_multiplier,
                    next_level: nextMilestone ? nextMilestone.level : null,
                    next_multiplier: nextMilestone ? nextMilestone.multiplier : null,
                    logs_until_next_level: nextMilestone ? nextMilestone.logs - milestone.total_logs : 0,
                    created_at: milestone.created_at,
                    last_updated: milestone.last_updated
                }
            });
        } catch (error) {
            console.error('Get food milestones error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve food milestones' });
        }
    }

    /**
     * Get user's weight logging milestones
     */
    static async getWeightMilestones(req, res) {
        try {
            const milestone = await PointsService.getWeightMilestone(req.user.id);

            // Find next milestone
            const nextMilestone = PointsService.WEIGHT_MILESTONE_THRESHOLDS.find(
                m => m.logs > milestone.total_logs
            );

            res.json({
                success: true,
                milestone: {
                    total_logs: milestone.total_logs,
                    current_level: milestone.milestone_level,
                    current_multiplier: milestone.points_multiplier,
                    next_level: nextMilestone ? nextMilestone.level : null,
                    next_multiplier: nextMilestone ? nextMilestone.multiplier : null,
                    logs_until_next_level: nextMilestone ? nextMilestone.logs - milestone.total_logs : 0,
                    created_at: milestone.created_at,
                    last_updated: milestone.last_updated
                }
            });
        } catch (error) {
            console.error('Get weight milestones error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve weight milestones' });
        }
    }

    /**
     * Get user's streaks (DEPRECATED - kept for backward compatibility)
     */
    static async getMyStreaks(req, res) {
        res.json({
            success: true,
            message: 'Streaks have been replaced with milestone-based progression',
            streaks: [],
            deprecationNotice: 'Use /food-milestones and /weight-milestones endpoints instead'
        });
    }
}

module.exports = RewardsController;
