const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const PointsService = require('../services/pointsService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Log body weight
router.post('/log', [
    body('weight_kg').isFloat({ min: 20, max: 300 }).withMessage('Weight must be between 20 and 300 kg'),
    body('log_date').optional().isISO8601().withMessage('Log date must be in YYYY-MM-DD format'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { weight_kg, notes } = req.body;
        const logDate = req.body.log_date || new Date().toISOString().split('T')[0];

        // Validate log_date is not in the future
        const today = new Date().toISOString().split('T')[0];
        if (logDate > today) {
            return res.status(400).json({
                success: false,
                error: 'Cannot log weight for future dates'
            });
        }
        
        // Check if this is a same-day log (for point rewards)
        const isSameDayLog = (logDate === today);

        // Check if weight already logged for this date
        const existing = await db.query(
            'SELECT id FROM weight_logs WHERE user_id = ? AND log_date = ?',
            [req.user.id, logDate]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Weight already logged for this date. Use PUT to update.'
            });
        }

        // Get previous weight for comparison
        const previousWeight = await db.query(
            'SELECT weight_kg FROM weight_logs WHERE user_id = ? AND log_date < ? ORDER BY log_date DESC LIMIT 1',
            [req.user.id, logDate]
        );

        const changeFromPrevious = previousWeight.length > 0 
            ? parseFloat((weight_kg - previousWeight[0].weight_kg).toFixed(1))
            : null;

        // Insert new weight log
        const result = await db.query(
            'INSERT INTO weight_logs (user_id, weight_kg, log_date, notes) VALUES (?, ?, ?, ?)',
            [req.user.id, weight_kg, logDate, notes || null]
        );

        // Award points for logging weight (only for same-day logs)
        let pointsAwarded = 0;
        let pointsDetails = [];
        try {
            if (isSameDayLog) {
                // Get current weight milestone to apply multiplier
                const weightMilestone = await PointsService.getWeightMilestone(req.user.id);
                const basePoints = PointsService.POINT_REWARDS.WEIGHT_LOG;
                const multipliedPoints = Math.round(basePoints * weightMilestone.points_multiplier);

                // Base points for weight logging (with multiplier applied)
                await PointsService.awardPoints(
                    req.user.id,
                    multipliedPoints,
                    'weight_log',
                    `Logged weight (${weightMilestone.points_multiplier}x multiplier)`,
                    'weight_log',
                    result.insertId,
                    { multiplier: weightMilestone.points_multiplier, basePoints: basePoints }
                );
                pointsAwarded += multipliedPoints;
                pointsDetails.push({ 
                    reason: 'weight_log', 
                    points: multipliedPoints,
                    basePoints: basePoints,
                    multiplier: weightMilestone.points_multiplier
                });

                // Check for first weight log achievement
                const [weightLogCount] = await db.query(
                    'SELECT COUNT(*) as count FROM weight_logs WHERE user_id = ?',
                    [req.user.id]
                );
                if (weightLogCount[0].count === 1) {
                    await PointsService.awardAchievement(
                        req.user.id,
                        'FIRST_WEIGHT_LOG',
                        'Weight Tracker',
                        'Logged your first weight',
                        '⚖️',
                        PointsService.POINT_REWARDS.FIRST_WEIGHT_LOG
                    );
                    pointsAwarded += PointsService.POINT_REWARDS.FIRST_WEIGHT_LOG;
                    pointsDetails.push({ reason: 'first_weight_log', points: PointsService.POINT_REWARDS.FIRST_WEIGHT_LOG });
                }

                // Check for weight milestone level up
                const milestoneResult = await PointsService.checkWeightMilestone(req.user.id);
                if (milestoneResult.leveledUp) {
                    pointsAwarded += milestoneResult.bonus;
                    pointsDetails.push({ 
                        reason: 'milestone_level_up', 
                        points: milestoneResult.bonus,
                        newLevel: milestoneResult.milestone_level,
                        newMultiplier: milestoneResult.multiplier
                    });
                }
            }
        } catch (pointsError) {
            console.error('Error awarding points:', pointsError);
            // Don't fail the weight log if points fail
        }

        res.status(201).json({
            success: true,
            data: {
                id: result.insertId,
                weight_kg: parseFloat(weight_kg),
                log_date: logDate,
                notes: notes || null,
                change_from_previous: changeFromPrevious
            },
            pointsAwarded: pointsAwarded,
            pointsDetails: pointsDetails
        });
    } catch (error) {
        console.error('Log weight error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log weight'
        });
    }
});

// Get weight history
router.get('/history', [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Get weight history
        const weights = await db.query(
            `SELECT id, weight_kg, log_date, log_time, notes 
             FROM weight_logs 
             WHERE user_id = ? AND log_date >= ?
             ORDER BY log_date DESC`,
            [req.user.id, startDateStr]
        );

        if (weights.length === 0) {
            return res.json({
                success: true,
                data: [],
                summary: null
            });
        }

        // Calculate changes
        const enrichedData = [];
        let previousWeight = null;
        const startingWeight = weights[weights.length - 1].weight_kg;

        // Process in reverse order (oldest first) to calculate changes
        for (let i = weights.length - 1; i >= 0; i--) {
            const weight = weights[i];
            const changeFromPrevious = previousWeight 
                ? parseFloat((weight.weight_kg - previousWeight).toFixed(1))
                : null;
            const changeFromStart = parseFloat((weight.weight_kg - startingWeight).toFixed(1));

            enrichedData.unshift({
                id: weight.id,
                weight_kg: parseFloat(weight.weight_kg),
                log_date: weight.log_date,
                log_time: weight.log_time,
                notes: weight.notes,
                change_from_previous: changeFromPrevious,
                change_from_start: changeFromStart
            });

            previousWeight = weight.weight_kg;
        }

        // Calculate summary statistics
        const currentWeight = parseFloat(weights[0].weight_kg);
        const totalChange = parseFloat((currentWeight - startingWeight).toFixed(1));
        
        // Calculate weeks in the period
        const oldestDate = new Date(weights[weights.length - 1].log_date);
        const newestDate = new Date(weights[0].log_date);
        const daysDiff = Math.ceil((newestDate - oldestDate) / (1000 * 60 * 60 * 24));
        const weeks = Math.max(daysDiff / 7, 0.1); // Avoid division by zero
        const averageChangePerWeek = parseFloat((totalChange / weeks).toFixed(2));

        // Determine trend
        let trend = 'stable';
        if (totalChange < -0.5) trend = 'decreasing';
        else if (totalChange > 0.5) trend = 'increasing';

        res.json({
            success: true,
            data: enrichedData,
            summary: {
                current_weight: currentWeight,
                starting_weight: parseFloat(startingWeight),
                total_change: totalChange,
                average_change_per_week: averageChangePerWeek,
                trend: trend
            }
        });
    } catch (error) {
        console.error('Get weight history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve weight history'
        });
    }
});

// Update weight log
router.put('/:id', [
    param('id').isInt({ min: 1 }).withMessage('Valid weight log ID is required'),
    body('weight_kg').optional().isFloat({ min: 20, max: 300 }).withMessage('Weight must be between 20 and 300 kg'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { weight_kg, notes } = req.body;

        // Verify the log exists and belongs to the user
        const existing = await db.query(
            'SELECT * FROM weight_logs WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Weight log entry not found'
            });
        }

        // Build update query
        const updates = [];
        const values = [];

        if (weight_kg !== undefined) {
            updates.push('weight_kg = ?');
            values.push(weight_kg);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update'
            });
        }

        values.push(id);
        values.push(req.user.id);

        const sql = `UPDATE weight_logs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
        await db.query(sql, values);

        // Fetch and return updated log
        const updated = await db.query(
            'SELECT id, weight_kg, log_date, log_time, notes FROM weight_logs WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({
            success: true,
            message: 'Weight log updated successfully',
            data: {
                id: updated[0].id,
                weight_kg: parseFloat(updated[0].weight_kg),
                log_date: updated[0].log_date,
                log_time: updated[0].log_time,
                notes: updated[0].notes
            }
        });
    } catch (error) {
        console.error('Update weight log error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update weight log'
        });
    }
});

// Delete weight log
router.delete('/:id', [
    param('id').isInt({ min: 1 }).withMessage('Valid weight log ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;

        // Delete the weight log
        const result = await db.query(
            'DELETE FROM weight_logs WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Weight log entry not found'
            });
        }

        res.json({
            success: true,
            message: 'Weight log deleted successfully'
        });
    } catch (error) {
        console.error('Delete weight log error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete weight log'
        });
    }
});

module.exports = router;
