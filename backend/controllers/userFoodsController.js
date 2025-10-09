// =====================================================
// USER-CONTRIBUTED FOODS MANAGEMENT CONTROLLER
// =====================================================
// Handles review and promotion of user-contributed foods
// to "Pios Food DB"
// =====================================================

const db = require('../database');

class UserFoodsController {
    
    /**
     * Get all user-contributed foods (pending review)
     * GET /api/admin/user-foods
     */
    async getUserContributedFoods(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50,
                sortBy = 'popularity', // popularity, recent, alphabetical
                minUsage = 0 // Minimum usage count filter
            } = req.query;
            
            const pageInt = parseInt(page);
            const limitInt = parseInt(limit);
            const offset = (pageInt - 1) * limitInt;
            const minUsageInt = parseInt(minUsage) || 0;
            
            // Build sort clause
            let orderBy = 'times_logged DESC, created_at DESC'; // default: popularity
            if (sortBy === 'recent') {
                orderBy = 'created_at DESC';
            } else if (sortBy === 'alphabetical') {
                orderBy = 'name ASC';
            }
            
            // Use string interpolation instead of prepared statements to avoid MySQL issues
            const sql = `
                SELECT * FROM (
                    SELECT 
                        f.*,
                        u.username as creator_username,
                        u.email as creator_email,
                        COUNT(DISTINCT fl.id) as times_logged,
                        COUNT(DISTINCT fl.user_id) as unique_users,
                        MAX(fl.logged_at) as last_used_at
                    FROM foods f
                    LEFT JOIN users u ON f.created_by = u.id
                    LEFT JOIN food_logs fl ON f.id = fl.food_id
                    WHERE f.source = 'custom' 
                      AND f.is_verified = 0
                      AND f.created_by IS NOT NULL
                    GROUP BY f.id
                ) as food_stats
                WHERE times_logged >= ${minUsageInt}
                ORDER BY ${orderBy}
                LIMIT ${limitInt} OFFSET ${offset}
            `;
            
            const foods = await db.query(sql);
            
            // Get total count
            const countSql = `
                SELECT COUNT(*) as total
                FROM (
                    SELECT 
                        f.id,
                        COUNT(DISTINCT fl.id) as times_logged
                    FROM foods f
                    LEFT JOIN food_logs fl ON f.id = fl.food_id
                    WHERE f.source = 'custom' 
                      AND f.is_verified = 0
                      AND f.created_by IS NOT NULL
                    GROUP BY f.id
                ) as food_stats
                WHERE times_logged >= ${minUsageInt}
            `;
            const countResult = await db.query(countSql);
            const total = countResult[0].total;
            
            res.json({
                success: true,
                foods,
                pagination: {
                    page: pageInt,
                    limit: limitInt,
                    total,
                    totalPages: Math.ceil(total / limitInt)
                }
            });
            
        } catch (error) {
            console.error('Get user contributed foods error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user-contributed foods',
                error: error.message
            });
        }
    }
    
    /**
     * Get statistics about user-contributed foods
     * GET /api/admin/user-foods/stats
     */
    async getStats(req, res) {
        try {
            const statsSql = `
                SELECT 
                    COUNT(DISTINCT f.id) as total_contributions,
                    COUNT(DISTINCT f.created_by) as unique_contributors,
                    COALESCE(SUM(log_counts.times_logged), 0) as total_usage
                FROM foods f
                LEFT JOIN (
                    SELECT food_id, COUNT(*) as times_logged
                    FROM food_logs
                    GROUP BY food_id
                ) log_counts ON f.id = log_counts.food_id
                WHERE f.source = 'custom' 
                  AND f.is_verified = 0
                  AND f.created_by IS NOT NULL
            `;
            
            const stats = await db.query(statsSql);
            
            // Get top contributors
            const topContributorsSql = `
                SELECT 
                    u.id,
                    u.username,
                    COUNT(DISTINCT f.id) as foods_contributed,
                    COALESCE(SUM(log_counts.times_logged), 0) as total_usage
                FROM users u
                JOIN foods f ON u.id = f.created_by
                LEFT JOIN (
                    SELECT food_id, COUNT(*) as times_logged
                    FROM food_logs
                    GROUP BY food_id
                ) log_counts ON f.id = log_counts.food_id
                WHERE f.source = 'custom' 
                  AND f.is_verified = 0
                GROUP BY u.id
                ORDER BY total_usage DESC, foods_contributed DESC
                LIMIT 10
            `;
            
            const topContributors = await db.query(topContributorsSql);
            
            res.json({
                success: true,
                stats: {
                    total_user_foods: stats[0].total_contributions,
                    total_contributors: stats[0].unique_contributors,
                    total_logs_of_user_foods: stats[0].total_usage,
                    avg_usage_per_food: stats[0].total_contributions > 0 
                        ? parseFloat((stats[0].total_usage / stats[0].total_contributions).toFixed(1))
                        : 0
                },
                topContributors
            });
            
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch statistics',
                error: error.message
            });
        }
    }
    
    /**
     * Promote a user-contributed food to "Pios Food DB"
     * POST /api/admin/user-foods/:id/promote
     */
    async promoteFood(req, res) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const adminId = req.user.id;
            
            // Verify food exists and is eligible for promotion
            const food = await db.query(
                'SELECT * FROM foods WHERE id = ? AND source = ? AND is_verified = 0',
                [id, 'custom']
            );
            
            if (!food || food.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Food not found or not eligible for promotion'
                });
            }
            
            // Promote the food
            await db.query(
                `UPDATE foods 
                 SET is_verified = 1,
                     verified_by = ?,
                     verified_at = NOW(),
                     contribution_notes = ?,
                     source = 'system'
                 WHERE id = ?`,
                [adminId, notes || null, id]
            );
            
            res.json({
                success: true,
                message: 'Food successfully promoted to Pios Food DB'
            });
            
        } catch (error) {
            console.error('Promote food error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to promote food',
                error: error.message
            });
        }
    }
    
    /**
     * Reject a user-contributed food
     * POST /api/admin/user-foods/:id/reject
     */
    async rejectFood(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = req.user.id;
            
            // Mark as rejected
            await db.query(
                `UPDATE foods 
                 SET is_verified = -1,
                     verified_by = ?,
                     verified_at = NOW(),
                     contribution_notes = ?
                 WHERE id = ? AND source = 'custom'`,
                [adminId, reason || 'Rejected by admin', id]
            );
            
            res.json({
                success: true,
                message: 'Food rejected'
            });
            
        } catch (error) {
            console.error('Reject food error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reject food',
                error: error.message
            });
        }
    }
    
    /**
     * Delete a user-contributed food
     * DELETE /api/admin/user-foods/:id
     */
    async deleteUserFood(req, res) {
        try {
            const { id } = req.params;
            
            // Check if food is being used in logs
            const logs = await db.query(
                'SELECT COUNT(*) as count FROM food_logs WHERE food_id = ?',
                [id]
            );
            
            if (logs[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete food that is being used in logs. Consider rejecting it instead.'
                });
            }
            
            // Delete the food
            await db.query(
                'DELETE FROM foods WHERE id = ? AND source = ? AND is_verified = 0',
                [id, 'custom']
            );
            
            res.json({
                success: true,
                message: 'Food deleted successfully'
            });
            
        } catch (error) {
            console.error('Delete user food error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete food',
                error: error.message
            });
        }
    }
    
    /**
     * Get all foods in "Pios Food DB" (verified foods)
     * GET /api/admin/user-foods/pios-food-db
     */
    async getPiosFoodDb(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50,
                search = ''
            } = req.query;
            
            const pageInt = parseInt(page);
            const limitInt = parseInt(limit);
            const offset = (pageInt - 1) * limitInt;
            
            let whereClauses = ['f.source = "system"', 'f.is_verified = 1'];
            let params = [];
            
            if (search) {
                whereClauses.push('f.name LIKE ?');
                params.push(`%${search}%`);
            }
            
            const sql = `
                SELECT 
                    f.*,
                    u.username as verified_by_username
                FROM foods f
                LEFT JOIN users u ON f.verified_by = u.id
                WHERE ${whereClauses.join(' AND ')}
                ORDER BY f.verified_at DESC, f.name ASC
                LIMIT ? OFFSET ?
            `;
            params.push(limitInt, offset);
            
            const foods = await db.query(sql, params);
            
            // Get total count
            const countSql = `
                SELECT COUNT(*) as total
                FROM foods f
                WHERE ${whereClauses.join(' AND ')}
            `;
            const countParams = search ? [`%${search}%`] : [];
            const countResult = await db.query(countSql, countParams);
            const total = countResult[0].total;
            
            res.json({
                success: true,
                foods,
                pagination: {
                    page: pageInt,
                    limit: limitInt,
                    total,
                    totalPages: Math.ceil(total / limitInt)
                }
            });
            
        } catch (error) {
            console.error('Get Pios Food DB error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch Pios Food DB',
                error: error.message
            });
        }
    }
}

module.exports = new UserFoodsController();
