const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const cacheCleanupJob = require('../jobs/cacheCleanup');

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
    const foods = await db.query(`
      SELECT 
        f.*,
        COUNT(fl.id) as usage_count,
        SUM(fl.quantity) as total_quantity_logged
      FROM foods f
      LEFT JOIN food_logs fl ON f.id = fl.food_id
      GROUP BY f.id
      ORDER BY usage_count DESC, f.name ASC
    `);
    
    res.json({
      success: true,
      foods
    });
  } catch (error) {
    console.error('Admin get foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve foods'
    });
  }
});

// Add new food (admin only)
router.post('/foods', async (req, res) => {
  try {
    const { name, calories_per_unit, default_unit, category, brand } = req.body;
    
    if (!name || !calories_per_unit || !default_unit) {
      return res.status(400).json({
        success: false,
        message: 'Name, calories per unit, and default unit are required'
      });
    }

    const result = await db.createFood(name, calories_per_unit, default_unit, category, brand);
    
    res.json({
      success: true,
      message: 'Food added successfully',
      foodId: result.insertId
    });
  } catch (error) {
    console.error('Admin add food error:', error);
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
    const { name, calories_per_unit, default_unit, category, brand } = req.body;
    
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
    console.error('Admin update food error:', error);
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
    console.error('Admin delete food error:', error);
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
        (SELECT COUNT(*) FROM foods) as total_foods,
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
        CONCAT(u.username, ' logged ', f.name) as description,
        fl.logged_at as activity_time
      FROM food_logs fl
      JOIN users u ON fl.user_id = u.id
      JOIN foods f ON fl.food_id = f.id
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

// Manual cache cleanup (admin only)
router.post('/cache/cleanup', async (req, res) => {
  try {
    const result = await cacheCleanupJob.runManualCleanup();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Manual cache cleanup error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get cache cleanup status (admin only)
router.get('/cache/status', async (req, res) => {
  try {
    const status = cacheCleanupJob.getStatus();
    const cacheStats = await db.query(`
      SELECT 
        COUNT(*) as total_cached_foods,
        AVG(usage_count) as avg_usage_count,
        MAX(usage_count) as max_usage_count,
        MIN(cached_at) as oldest_cache,
        MAX(cached_at) as newest_cache
      FROM cached_external_foods
    `);
    
    res.json({
      success: true,
      cleanup_status: status,
      cache_stats: cacheStats[0] || {}
    });
  } catch (error) {
    console.error('Cache status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache status'
    });
  }
});

module.exports = router;