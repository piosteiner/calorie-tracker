const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Apply auth middleware first, then admin check
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await db.query(`
      SELECT 
        id, 
        username, 
        email, 
        role,
        daily_calorie_goal, 
        created_at, 
        is_active,
        (SELECT COUNT(*) FROM food_logs WHERE user_id = users.id) as total_logs,
        (SELECT SUM(calories) FROM food_logs WHERE user_id = users.id) as total_calories
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
});

// Get user details (admin only)
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user without password hash (security best practice)
    const user = await db.query(`
      SELECT 
        id, 
        username, 
        email, 
        role,
        daily_calorie_goal, 
        created_at, 
        is_active,
        (SELECT COUNT(*) FROM sessions WHERE user_id = ? AND is_active = TRUE) as active_sessions,
        (SELECT MAX(logged_at) FROM food_logs WHERE user_id = ?) as last_activity
      FROM users 
      WHERE id = ?
    `, [userId, userId, userId]);

    if (!user.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's food logs
    const foodLogs = await db.query(`
      SELECT 
        fl.*,
        f.name as food_name,
        f.category
      FROM food_logs fl
      JOIN foods f ON fl.food_id = f.id
      WHERE fl.user_id = ?
      ORDER BY fl.logged_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      success: true,
      user: user[0],
      foodLogs
    });
  } catch (error) {
    console.error('Admin get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details'
    });
  }
});

// Reset user password (admin only) - more secure than showing hashes
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the new password
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    
    const result = await db.query(`
      UPDATE users 
      SET password_hash = ?
      WHERE id = ?
    `, [passwordHash, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log the password reset for security audit
    console.log(`Admin ${req.admin.username} reset password for user ID ${userId}`);
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Get all foods (admin only)
router.get('/foods', async (req, res) => {
  try {
    // Get local foods with usage statistics
    const localFoods = await db.query(`
      SELECT 
        f.id,
        f.name,
        f.calories_per_100g as calories,
        f.default_unit as unit,
        f.category,
        f.brand,
        f.distributor,
        'local' as source,
        COUNT(fl.id) as usage_count,
        SUM(fl.quantity) as total_quantity_logged,
        f.created_at
      FROM foods f
      LEFT JOIN food_logs fl ON f.id = fl.food_id
      GROUP BY f.id
      ORDER BY REPLACE(REPLACE(REPLACE(UPPER(f.name), 'Ä', 'AE'), 'Ö', 'OE'), 'Ü', 'UE') ASC
    `);
    
    res.json({
      success: true,
      foods: localFoods,
      summary: {
        total_foods: localFoods.length,
        local_foods: localFoods.length
      }
    });
  } catch (error) {
    console.error('Pios Food DB get error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve foods'
    });
  }
});

// Add new food (admin only)
router.post('/foods', async (req, res) => {
  try {
    const { name, calories_per_100g, category, brand, distributor } = req.body;
    
    if (!name || !calories_per_100g) {
      return res.status(400).json({
        success: false,
        message: 'Name and calories per 100g are required'
      });
    }

    // Always use 100g as the default unit since all calories are standardized to per 100g
    const default_unit = '100g';
    const result = await db.createFood(name, calories_per_100g, default_unit, category, brand, distributor);
    
    res.json({
      success: true,
      message: 'Food added successfully',
      foodId: result.insertId
    });
  } catch (error) {
    console.error('Pios Food DB add error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({
        success: false,
        message: 'Food with this name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add food'
      });
    }
  }
});

// Update food (admin only)
router.put('/foods/:foodId', async (req, res) => {
  try {
    const foodId = req.params.foodId;
    const { name, calories_per_100g, category, brand, distributor } = req.body;
    
    // Always use 100g as the default unit since all calories are standardized to per 100g
    const default_unit = '100g';
    
    // Convert undefined values to null to prevent MySQL binding errors
    const safeName = name !== undefined ? name : null;
    const safeCalories = calories_per_100g !== undefined ? calories_per_100g : null;
    const safeCategory = category !== undefined ? category : null;
    const safeBrand = brand !== undefined ? brand : null;
    const safeDistributor = distributor !== undefined ? distributor : null;
    
    const result = await db.query(`
      UPDATE foods 
      SET name = ?, calories_per_100g = ?, default_unit = ?, category = ?, brand = ?, distributor = ?
      WHERE id = ?
    `, [safeName, safeCalories, default_unit, safeCategory, safeBrand, safeDistributor, foodId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Food updated successfully'
    });
  } catch (error) {
    console.error('Pios Food DB update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update food'
    });
  }
});

// Delete food (admin only)
router.delete('/foods/:foodId', async (req, res) => {
  try {
    const foodId = req.params.foodId;
    
    // Check if food is used in any logs
    const usage = await db.query('SELECT COUNT(*) as count FROM food_logs WHERE food_id = ?', [foodId]);
    
    if (usage[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete food that has been logged by users'
      });
    }

    const result = await db.query('DELETE FROM foods WHERE id = ?', [foodId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Food deleted successfully'
    });
  } catch (error) {
    console.error('Pios Food DB delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete food'
    });
  }
});

// Get system statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM foods) as total_local_foods,
        (SELECT COUNT(*) FROM food_logs) as total_logs,
        (SELECT COUNT(*) FROM sessions WHERE is_active = TRUE AND expires_at > NOW()) as active_sessions,
        (SELECT AVG(daily_calorie_goal) FROM users WHERE is_active = TRUE) as avg_calorie_goal
    `);
    
    const recentActivity = await db.query(`
      SELECT 
        'user_registration' as activity_type,
        username as description,
        created_at as activity_time
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      UNION ALL
      SELECT 
        'food_log' as activity_type,
        CONCAT(u.username, ' logged ', COALESCE(fl.name, f.name)) as description,
        fl.logged_at as activity_time
      FROM food_logs fl
      JOIN users u ON fl.user_id = u.id
      LEFT JOIN foods f ON fl.food_id = f.id
      WHERE fl.logged_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY activity_time DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      stats: stats[0],
      recentActivity
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
});

// =============================================================================
// FOOD MANAGEMENT ROUTES
// =============================================================================

// Get enhanced foods with filtering and pagination
router.get('/foods-enhanced', async (req, res) => {
  try {
    const { limit = 50, source, search } = req.query;

    let sql = `
      SELECT 
        f.id,
        f.name,
        f.calories_per_100g,
        f.default_unit,
        f.category,
        f.brand,
        f.distributor,
        f.source,
        f.protein_per_100g,
        f.carbs_per_100g,
        f.fat_per_100g,
        f.fiber_per_100g,
        f.is_verified,
        f.created_at,
        f.updated_at,
        (SELECT COUNT(*) FROM food_logs fl WHERE fl.food_id = f.id) as usage_count
      FROM foods f
    `;

    const conditions = [];
    const params = [];

    if (source) {
      conditions.push('f.source = ?');
      params.push(source);
    }

    if (search) {
      conditions.push('(f.name LIKE ? OR f.brand LIKE ? OR f.distributor LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY REPLACE(REPLACE(REPLACE(UPPER(f.name), \'Ä\', \'AE\'), \'Ö\', \'OE\'), \'Ü\', \'UE\') ASC LIMIT ?';
    params.push(parseInt(limit));

    const foods = await db.query(sql, params);

    res.json({
      success: true,
      foods,
      total: foods.length
    });

  } catch (error) {
    console.error('Get enhanced foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve foods',
      error: error.message
    });
  }
});

// Get food categories
router.get('/food-categories', async (req, res) => {
  try {
    const categories = await db.query(`
      SELECT 
        fc.*,
        COUNT(f.id) as food_count
      FROM food_categories fc
      LEFT JOIN foods f ON fc.id = f.category_id
      GROUP BY fc.id
      ORDER BY fc.name
    `);

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories'
    });
  }
});

// =============================================================================
// SHOP ITEM MANAGEMENT ROUTES
// =============================================================================

// Get all shop items (admin only)
router.get('/shop', async (req, res) => {
  try {
    const { category, is_active, search } = req.query;

    let sql = `
      SELECT 
        ri.*,
        (SELECT COUNT(*) FROM user_purchases WHERE item_id = ri.id) as total_purchases,
        (SELECT SUM(cost_points) FROM user_purchases up 
         JOIN reward_items ri2 ON up.item_id = ri2.id 
         WHERE up.item_id = ri.id) as total_revenue
      FROM reward_items ri
      WHERE 1=1
    `;

    const params = [];

    if (category) {
      sql += ' AND ri.category = ?';
      params.push(category);
    }

    if (is_active !== undefined) {
      sql += ' AND ri.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (search) {
      sql += ' AND (ri.name LIKE ? OR ri.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY ri.category, ri.display_order, ri.cost_points';

    const items = await db.query(sql, params);

    // Parse JSON fields
    const enrichedItems = items.map(item => ({
      ...item,
      item_data: item.item_data ? JSON.parse(item.item_data) : null,
      total_purchases: item.total_purchases || 0,
      total_revenue: item.total_revenue || 0
    }));

    res.json({
      success: true,
      items: enrichedItems,
      total: enrichedItems.length
    });

  } catch (error) {
    console.error('Admin get shop items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shop items',
      error: error.message
    });
  }
});

// Get single shop item details (admin only)
router.get('/shop/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const [item] = await db.query(`
      SELECT 
        ri.*,
        (SELECT COUNT(*) FROM user_purchases WHERE item_id = ri.id) as total_purchases,
        (SELECT COUNT(DISTINCT user_id) FROM user_purchases WHERE item_id = ri.id) as unique_purchasers
      FROM reward_items ri
      WHERE ri.id = ?
    `, [itemId]);

    if (!item[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    // Get recent purchases
    const recentPurchases = await db.query(`
      SELECT 
        up.id,
        up.user_id,
        up.purchased_at,
        up.is_equipped,
        u.username
      FROM user_purchases up
      JOIN users u ON up.user_id = u.id
      WHERE up.item_id = ?
      ORDER BY up.purchased_at DESC
      LIMIT 20
    `, [itemId]);

    const enrichedItem = {
      ...item[0],
      item_data: item[0].item_data ? JSON.parse(item[0].item_data) : null,
      recent_purchases: recentPurchases
    };

    res.json({
      success: true,
      item: enrichedItem
    });

  } catch (error) {
    console.error('Admin get shop item details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shop item details',
      error: error.message
    });
  }
});

// Create new shop item (admin only)
router.post('/shop', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      cost_points,
      item_data,
      is_active = true,
      is_limited_edition = false,
      stock_quantity = null,
      purchase_limit = null,
      required_level = 1,
      display_order = 0
    } = req.body;

    // Validation
    if (!name || !category || cost_points === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and cost_points are required'
      });
    }

    const validCategories = ['theme', 'badge', 'feature', 'avatar', 'powerup', 'challenge'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    if (cost_points < 0) {
      return res.status(400).json({
        success: false,
        message: 'Cost points must be >= 0'
      });
    }

    // Convert item_data to JSON string if it's an object
    const itemDataString = item_data ? (typeof item_data === 'string' ? item_data : JSON.stringify(item_data)) : null;

    const result = await db.query(`
      INSERT INTO reward_items (
        name, description, category, cost_points, item_data,
        is_active, is_limited_edition, stock_quantity, purchase_limit,
        required_level, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description || null,
      category,
      cost_points,
      itemDataString,
      is_active ? 1 : 0,
      is_limited_edition ? 1 : 0,
      stock_quantity,
      purchase_limit,
      required_level,
      display_order
    ]);

    console.log(`Admin ${req.user.username} created shop item: ${name} (ID: ${result.insertId})`);

    res.json({
      success: true,
      message: 'Shop item created successfully',
      itemId: result.insertId
    });

  } catch (error) {
    console.error('Admin create shop item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shop item',
      error: error.message
    });
  }
});

// Update shop item (admin only)
router.put('/shop/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      name,
      description,
      category,
      cost_points,
      item_data,
      is_active,
      is_limited_edition,
      stock_quantity,
      purchase_limit,
      required_level,
      display_order
    } = req.body;

    // Check if item exists
    const [existing] = await db.query('SELECT id, name FROM reward_items WHERE id = ?', [itemId]);
    if (!existing[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['theme', 'badge', 'feature', 'avatar', 'powerup', 'challenge'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        });
      }
    }

    // Validate cost_points if provided
    if (cost_points !== undefined && cost_points < 0) {
      return res.status(400).json({
        success: false,
        message: 'Cost points must be >= 0'
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (cost_points !== undefined) {
      updates.push('cost_points = ?');
      params.push(cost_points);
    }
    if (item_data !== undefined) {
      updates.push('item_data = ?');
      const itemDataString = item_data ? (typeof item_data === 'string' ? item_data : JSON.stringify(item_data)) : null;
      params.push(itemDataString);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (is_limited_edition !== undefined) {
      updates.push('is_limited_edition = ?');
      params.push(is_limited_edition ? 1 : 0);
    }
    if (stock_quantity !== undefined) {
      updates.push('stock_quantity = ?');
      params.push(stock_quantity);
    }
    if (purchase_limit !== undefined) {
      updates.push('purchase_limit = ?');
      params.push(purchase_limit);
    }
    if (required_level !== undefined) {
      updates.push('required_level = ?');
      params.push(required_level);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(display_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(itemId);
    const sql = `UPDATE reward_items SET ${updates.join(', ')} WHERE id = ?`;
    
    await db.query(sql, params);

    console.log(`Admin ${req.user.username} updated shop item ID ${itemId}`);

    res.json({
      success: true,
      message: 'Shop item updated successfully'
    });

  } catch (error) {
    console.error('Admin update shop item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shop item',
      error: error.message
    });
  }
});

// Toggle item active status (admin only) - Quick enable/disable
router.patch('/shop/:itemId/toggle', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get current status
    const [item] = await db.query('SELECT id, name, is_active FROM reward_items WHERE id = ?', [itemId]);
    
    if (!item[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    // Toggle the status
    const newStatus = !item[0].is_active;
    
    await db.query('UPDATE reward_items SET is_active = ? WHERE id = ?', [newStatus ? 1 : 0, itemId]);

    console.log(`Admin ${req.user.username} ${newStatus ? 'enabled' : 'disabled'} shop item: ${item[0].name} (ID: ${itemId})`);

    res.json({
      success: true,
      message: `Shop item ${newStatus ? 'enabled' : 'disabled'} successfully`,
      is_active: newStatus
    });

  } catch (error) {
    console.error('Admin toggle shop item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle shop item status',
      error: error.message
    });
  }
});

// Update stock quantity (admin only)
router.patch('/shop/:itemId/stock', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { stock_quantity } = req.body;

    if (stock_quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'stock_quantity is required'
      });
    }

    // Check if item exists
    const [item] = await db.query('SELECT id, name FROM reward_items WHERE id = ?', [itemId]);
    
    if (!item[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    await db.query('UPDATE reward_items SET stock_quantity = ? WHERE id = ?', [stock_quantity, itemId]);

    console.log(`Admin ${req.user.username} updated stock for ${item[0].name} to ${stock_quantity}`);

    res.json({
      success: true,
      message: 'Stock quantity updated successfully',
      stock_quantity
    });

  } catch (error) {
    console.error('Admin update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock quantity',
      error: error.message
    });
  }
});

// Delete shop item (admin only)
router.delete('/shop/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Check if item exists
    const [item] = await db.query('SELECT id, name FROM reward_items WHERE id = ?', [itemId]);
    
    if (!item[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shop item not found'
      });
    }

    // Check if item has been purchased
    const [purchases] = await db.query('SELECT COUNT(*) as count FROM user_purchases WHERE item_id = ?', [itemId]);
    
    if (purchases[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item that has been purchased. Consider disabling it instead.',
        purchases: purchases[0].count
      });
    }

    await db.query('DELETE FROM reward_items WHERE id = ?', [itemId]);

    console.log(`Admin ${req.user.username} deleted shop item: ${item[0].name} (ID: ${itemId})`);

    res.json({
      success: true,
      message: 'Shop item deleted successfully'
    });

  } catch (error) {
    console.error('Admin delete shop item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shop item',
      error: error.message
    });
  }
});

// Get shop statistics (admin only)
router.get('/shop/stats/summary', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM reward_items) as total_items,
        (SELECT COUNT(*) FROM reward_items WHERE is_active = TRUE) as active_items,
        (SELECT COUNT(*) FROM reward_items WHERE is_active = FALSE) as inactive_items,
        (SELECT COUNT(*) FROM user_purchases) as total_purchases,
        (SELECT COUNT(DISTINCT user_id) FROM user_purchases) as unique_customers,
        (SELECT SUM(ri.cost_points) FROM user_purchases up 
         JOIN reward_items ri ON up.item_id = ri.id) as total_revenue
    `);

    // Get top selling items
    const topItems = await db.query(`
      SELECT 
        ri.id,
        ri.name,
        ri.category,
        ri.cost_points,
        COUNT(up.id) as purchase_count,
        COUNT(DISTINCT up.user_id) as unique_buyers,
        SUM(ri.cost_points) as revenue
      FROM reward_items ri
      LEFT JOIN user_purchases up ON ri.id = up.item_id
      GROUP BY ri.id
      ORDER BY purchase_count DESC, revenue DESC
      LIMIT 10
    `);

    // Get category breakdown
    const categoryStats = await db.query(`
      SELECT 
        ri.category,
        COUNT(DISTINCT ri.id) as item_count,
        COUNT(up.id) as purchase_count,
        SUM(ri.cost_points) as revenue
      FROM reward_items ri
      LEFT JOIN user_purchases up ON ri.id = up.item_id
      GROUP BY ri.category
      ORDER BY purchase_count DESC
    `);

    res.json({
      success: true,
      summary: stats[0],
      top_items: topItems,
      category_breakdown: categoryStats
    });

  } catch (error) {
    console.error('Admin shop stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve shop statistics',
      error: error.message
    });
  }
});

module.exports = router;