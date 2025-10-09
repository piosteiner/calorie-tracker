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
            
            const offset = (page - 1) * limit;
            
            // Build sort clause
            let orderBy = 'times_logged DESC, f.created_at DESC'; // default: popularity
            if (sortBy === 'recent') {
                orderBy = 'f.created_at DESC';
            } else if (sortBy === 'alphabetical') {
                orderBy = 'f.name ASC';
            }
            
            const sql = `
                SELECT 
                    f.*,
                    u.username as creator_username,
                    u.email as creator_email,
                    COUNT(DISTINCT fl.id) as times_logged,
                    COUNT(DISTINCT fl.user_id) as unique_users,
                    MAX(fl.created_at) as last_used_at
                FROM foods f
                LEFT JOIN users u ON f.created_by = u.id
                LEFT JOIN food_logs fl ON f.id = fl.food_id
                WHERE f.source = 'custom' 
                  AND f.is_verified = 0
                  AND f.created_by IS NOT NULL
                GROUP BY f.id
                HAVING times_logged >= ?
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `;
            
            const foods = await db.query(sql, [minUsage, parseInt(limit), parseInt(offset)]);
            
            // Get total count
            const countSql = `
                SELECT COUNT(DISTINCT f.id) as total
                FROM foods f
                LEFT JOIN food_logs fl ON f.id = fl.food_id
                WHERE f.source = 'custom' 
                  AND f.is_verified = 0
                  AND f.created_by IS NOT NULL
                GROUP BY f.id
                HAVING COUNT(DISTINCT fl.id) >= ?
            `;
            const countResult = await db.query(countSql, [minUsage]);
            const total = countResult.length;
            
            res.json({
                success: true,
                foods,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
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
     * Get statistics about user contributions
     * GET /api/admin/user-foods/stats
     */
    async getContributionStats(req, res) {
        try {
            const stats = await db.query(`
                SELECT 
                    COUNT(DISTINCT f.id) as total_user_foods,
                    COUNT(DISTINCT f.created_by) as total_contributors,
                    COUNT(DISTINCT fl.id) as total_logs_of_user_foods,
                    AVG(usage_counts.times_logged) as avg_usage_per_food,
                    SUM(CASE WHEN usage_counts.times_logged >= 5 THEN 1 ELSE 0 END) as popular_foods_count,
                    SUM(CASE WHEN usage_counts.times_logged >= 10 THEN 1 ELSE 0 END) as very_popular_foods_count
                FROM foods f
                LEFT JOIN food_logs fl ON f.id = fl.food_id
                LEFT JOIN (
                    SELECT food_id, COUNT(*) as times_logged
                    FROM food_logs
                    GROUP BY food_id
                ) usage_counts ON f.id = usage_counts.food_id
                WHERE f.source = 'custom' 
                  AND f.is_verified = 0
                  AND f.created_by IS NOT NULL
            `);
            
            const topContributors = await db.query(`
                SELECT 
                    u.id,
                    u.username,
                    COUNT(DISTINCT f.id) as foods_contributed,
                    SUM(usage_counts.times_logged) as total_usage
                FROM users u
                JOIN foods f ON u.id = f.created_by
                LEFT JOIN (
                    SELECT food_id, COUNT(*) as times_logged
                    FROM food_logs
                    GROUP BY food_id
                ) usage_counts ON f.id = usage_counts.food_id
                WHERE f.source = 'custom' 
                  AND f.is_verified = 0
                GROUP BY u.id
                ORDER BY foods_contributed DESC
                LIMIT 10
            `);
            
            res.json({
                success: true,
                stats: stats[0],
                topContributors
            });
            
        } catch (error) {
            console.error('Get contribution stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch contribution statistics',
                error: error.message
            });
        }
    }
    
    /**
     * Promote/adopt a user-contributed food to Pios Food DB
     * POST /api/admin/user-foods/:id/promote
     */
    async promoteFood(req, res) {
        try {
            const { id } = req.params;
            const { 
                editedData, // Optional: edited food data before promotion
                notes // Admin notes about this food
            } = req.body;
            
            const adminId = req.user.id;
            
            // Get the food
            const foods = await db.query('SELECT * FROM foods WHERE id = ?', [id]);
            if (foods.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Food not found'
                });
            }
            
            const food = foods[0];
            
            // Check if already verified
            if (food.is_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Food is already verified in Pios Food DB'
                });
            }
            
            // If admin provided edited data, apply it
            if (editedData) {
                const updateFields = [];
                const updateValues = [];
                
                const allowedFields = [
                    'name', 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g',
                    'fat_per_100g', 'fiber_per_100g', 'sodium_per_100g', 'sugar_per_100g',
                    'brand', 'distributor', 'description', 'category_id', 'barcode'
                ];
                
                allowedFields.forEach(field => {
                    if (editedData[field] !== undefined) {
                        updateFields.push(`${field} = ?`);
                        updateValues.push(editedData[field]);
                    }
                });
                
                if (updateFields.length > 0) {
                    const updateSql = `
                        UPDATE foods 
                        SET ${updateFields.join(', ')}
                        WHERE id = ?
                    `;
                    updateValues.push(id);
                    await db.query(updateSql, updateValues);
                }
            }
            
            // Promote to Pios Food DB
            await db.query(`
                UPDATE foods 
                SET 
                    is_verified = 1,
                    verified_by = ?,
                    verified_at = NOW(),
                    contribution_notes = ?,
                    is_public = 1,
                    source = 'system'
                WHERE id = ?
            `, [adminId, notes || null, id]);
            
            // Get updated food
            const updatedFoods = await db.query(`
                SELECT 
                    f.*,
                    u.username as creator_username,
                    v.username as verified_by_username
                FROM foods f
                LEFT JOIN users u ON f.created_by = u.id
                LEFT JOIN users v ON f.verified_by = v.id
                WHERE f.id = ?
            `, [id]);
            
            res.json({
                success: true,
                message: `"${food.name}" has been promoted to Pios Food DB`,
                food: updatedFoods[0]
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
     * Reject a user-contributed food (don't promote it)
     * POST /api/admin/user-foods/:id/reject
     */
    async rejectFood(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            
            // Add rejection note
            await db.query(`
                UPDATE foods 
                SET contribution_notes = ?
                WHERE id = ?
            `, [`REJECTED: ${reason || 'No reason provided'}`, id]);
            
            res.json({
                success: true,
                message: 'Food contribution rejected and noted'
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
            
            // Check if food is used in logs
            const logs = await db.query('SELECT COUNT(*) as count FROM food_logs WHERE food_id = ?', [id]);
            
            if (logs[0].count > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete food that has been logged by users. Consider rejecting it instead.',
                    logsCount: logs[0].count
                });
            }
            
            await db.query('DELETE FROM foods WHERE id = ? AND is_verified = 0', [id]);
            
            res.json({
                success: true,
                message: 'User-contributed food deleted'
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
     * Get Pios Food DB (all verified foods)
     * GET /api/admin/pios-food-db
     */
    async getPiosFoodDb(req, res) {
        try {
            const { page = 1, limit = 100, search = '' } = req.query;
            const offset = (page - 1) * limit;
            
            let whereClauses = ['f.is_verified = 1'];
            let params = [];
            
            if (search) {
                whereClauses.push('(f.name LIKE ? OR f.brand LIKE ? OR f.distributor LIKE ?)');
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            const sql = `
                SELECT 
                    f.*,
                    u.username as creator_username,
                    v.username as verified_by_username,
                    COUNT(DISTINCT fl.id) as total_logs,
                    COUNT(DISTINCT fl.user_id) as unique_users
                FROM foods f
                LEFT JOIN users u ON f.created_by = u.id
                LEFT JOIN users v ON f.verified_by = v.id
                LEFT JOIN food_logs fl ON f.id = fl.food_id
                WHERE ${whereClauses.join(' AND ')}
                GROUP BY f.id
                ORDER BY f.name ASC
                LIMIT ? OFFSET ?
            `;
            
            params.push(parseInt(limit), parseInt(offset));
            const foods = await db.query(sql, params);
            
            // Get total count
            const countSql = `
                SELECT COUNT(*) as total
                FROM foods f
                WHERE ${whereClauses.join(' AND ')}
            `;
            const countResult = await db.query(countSql, params.slice(0, -2));
            const total = countResult[0].total;
            
            res.json({
                success: true,
                foods,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
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
