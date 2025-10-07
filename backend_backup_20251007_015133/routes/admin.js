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
        f.calories_per_unit as calories,
        f.default_unit as unit,
        f.category,
        f.brand,
        'local' as source,
        COUNT(fl.id) as usage_count,
        SUM(fl.quantity) as total_quantity_logged,
        f.created_at
      FROM foods f
      LEFT JOIN food_logs fl ON f.id = fl.food_id
      GROUP BY f.id
      ORDER BY usage_count DESC, f.created_at DESC
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
    const { name, calories_per_unit, category, brand } = req.body;
    
    if (!name || !calories_per_unit) {
      return res.status(400).json({
        success: false,
        message: 'Name and calories per unit are required'
      });
    }

    // Always use 100g as the default unit since all calories are standardized to per 100g
    const default_unit = '100g';
    const result = await db.createFood(name, calories_per_unit, default_unit, category, brand);
    
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
    const { name, calories_per_unit, category, brand } = req.body;
    
    // Always use 100g as the default unit since all calories are standardized to per 100g
    const default_unit = '100g';
    
    const result = await db.query(`
      UPDATE foods 
      SET name = ?, calories_per_unit = ?, default_unit = ?, category = ?, brand = ?
      WHERE id = ?
    `, [name, calories_per_unit, default_unit, category, brand, foodId]);

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
        f.calories_per_unit,
        f.default_unit,
        f.category,
        f.brand,
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
      conditions.push('(f.name LIKE ? OR f.brand LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY f.created_at DESC LIMIT ?';
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

module.exports = router;