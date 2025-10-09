const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAdmin } = require('../middleware/admin');

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get all tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await db.query(`
      SELECT 
        TABLE_NAME as table_name,
        TABLE_ROWS as row_count,
        DATA_LENGTH + INDEX_LENGTH as size_bytes,
        CREATE_TIME as created_at,
        UPDATE_TIME as updated_at
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);
    
    res.json({
      success: true,
      tables
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tables'
    });
  }
});

// Get table structure
router.get('/tables/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Validate table name exists (security check)
    const tableExists = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);
    
    if (tableExists[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }
    
    const columns = await db.query(`
      SELECT 
        COLUMN_NAME as column_name,
        DATA_TYPE as data_type,
        IS_NULLABLE as is_nullable,
        COLUMN_DEFAULT as default_value,
        COLUMN_KEY as key_type,
        EXTRA as extra
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);
    
    res.json({
      success: true,
      table: tableName,
      columns
    });
  } catch (error) {
    console.error('Get table structure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve table structure'
    });
  }
});

// Browse table data
router.get('/tables/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Validate table name exists (security check)
    const tableExists = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);
    
    if (tableExists[0].count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }
    
    // Get total count
    const totalResult = await db.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
    const total = totalResult[0].total;
    
    // Get data with pagination
    let data;
    if (search) {
      // Simple search across all text columns
      const columns = await db.query(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND DATA_TYPE IN ('varchar', 'text', 'char')
      `, [tableName]);
      
      if (columns.length > 0) {
        const searchConditions = columns.map(col => 
          `\`${col.COLUMN_NAME}\` LIKE ?`
        ).join(' OR ');
        
        const searchParams = columns.map(() => `%${search}%`);
        
        data = await db.query(
          `SELECT * FROM \`${tableName}\` WHERE ${searchConditions} LIMIT ? OFFSET ?`,
          [...searchParams, parseInt(limit), parseInt(offset)]
        );
      } else {
        data = [];
      }
    } else {
      data = await db.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, 
        [parseInt(limit), parseInt(offset)]);
    }
    
    res.json({
      success: true,
      table: tableName,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Browse table data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve table data'
    });
  }
});

// Execute safe SELECT query
router.post('/query', async (req, res) => {
  try {
    const { sql } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        message: 'SQL query is required'
      });
    }
    
    // Only allow SELECT queries for security
    const trimmedSQL = sql.trim().toUpperCase();
    if (!trimmedSQL.startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        message: 'Only SELECT queries are allowed'
      });
    }
    
    // Execute query with timeout
    const startTime = Date.now();
    const results = await db.query(sql);
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      results,
      meta: {
        rowCount: results.length,
        executionTime: `${executionTime}ms`
      }
    });
  } catch (error) {
    console.error('Query execution error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) as table_count,
        (SELECT SUM(TABLE_ROWS) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) as total_rows,
        (SELECT SUM(DATA_LENGTH + INDEX_LENGTH) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()) as database_size,
        DATABASE() as database_name,
        VERSION() as mysql_version
    `);
    
    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Get database stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve database statistics'
    });
  }
});

module.exports = router;