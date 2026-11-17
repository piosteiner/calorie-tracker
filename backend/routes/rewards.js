const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const ProgressService = require('../services/progressService');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/rewards/progress?today=YYYY-MM-DD
 * Points, level, today's checklist, badges and the last days (see services/progressService.js).
 * `today` is the app's local date, so "today" matches what the user sees.
 */
router.get('/progress', [
    query('today').optional().matches(/^\d{4}-\d{2}-\d{2}$/)
], async (req, res) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ success: false, error: 'today must be YYYY-MM-DD' });
    try {
        res.json({ success: true, progress: await ProgressService.getProgress(req.user.id, req.query.today) });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({ success: false, error: 'Failed to load progress' });
    }
});

module.exports = router;
