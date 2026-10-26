const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/comments?date=YYYY-MM-DD
// Returns the comment for the given date (or today if omitted)
router.get('/', [
    query('date').optional().isISO8601().toDate().withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const date = req.query.date || new Date().toISOString().split('T')[0];

        const rows = await db.query(
            'SELECT id, log_date, comment, created_at, updated_at FROM day_comments WHERE user_id = ? AND log_date = ?',
            [req.user.id, date]
        );

        if (rows.length === 0) {
            return res.json({ comment: null, log_date: date });
        }

        return res.json(rows[0]);
    } catch (error) {
        console.error('GET /api/comments error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/comments
// Creates or replaces the comment for a given date
router.put('/', [
    body('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
    body('comment').trim().notEmpty().withMessage('Comment is required').isLength({ max: 2000 }).withMessage('Comment must not exceed 2000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const date = req.body.date || new Date().toISOString().split('T')[0];
        const { comment } = req.body;

        await db.query(
            `INSERT INTO day_comments (user_id, log_date, comment)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, date, comment]
        );

        const rows = await db.query(
            'SELECT id, log_date, comment, created_at, updated_at FROM day_comments WHERE user_id = ? AND log_date = ?',
            [req.user.id, date]
        );

        return res.json(rows[0]);
    } catch (error) {
        console.error('PUT /api/comments error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/comments?date=YYYY-MM-DD
// Removes the comment for the given date
router.delete('/', [
    query('date').isISO8601().withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { date } = req.query;

        const result = await db.query(
            'DELETE FROM day_comments WHERE user_id = ? AND log_date = ?',
            [req.user.id, date]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No comment found for this date' });
        }

        return res.json({ success: true, log_date: date });
    } catch (error) {
        console.error('DELETE /api/comments error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
