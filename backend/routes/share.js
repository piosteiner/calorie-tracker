/**
 * /api/share — Public (unauthenticated) routes for shared food logs
 * 
 * A food log is shareable only when the owner has generated a share_token via
 * POST /api/logs/:id/share. Revoking the token (DELETE /api/logs/:id/share)
 * immediately cuts off public access to both the log and its attached image.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fsSync = require('fs');
const db = require('../database');

const uploadsDir = path.join(__dirname, '../uploads/images');

// GET /api/share/log/:token — returns the shared log entry as JSON
router.get('/log/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Basic sanity check — tokens are 22 base64url chars
        if (!/^[A-Za-z0-9_-]{22}$/.test(token)) {
            return res.status(404).json({ success: false, error: { message: 'Shared log not found' } });
        }

        const log = await db.getSharedLog(token);
        if (!log) {
            return res.status(404).json({ success: false, error: { message: 'Shared log not found' } });
        }

        // Build a public image URL if an image is attached
        const imageUrl = log.image_filename
            ? `/api/share/image/${token}`
            : null;

        res.json({
            success: true,
            data: {
                food_name:     log.food_name,
                quantity:      log.quantity,
                unit:          log.unit,
                calories:      log.calories,
                log_date:      log.log_date,
                meal_category: log.meal_category,
                meal_time:     log.meal_time,
                shared_by:     log.username,
                image_url:     imageUrl
            }
        });
    } catch (error) {
        console.error('Get shared log error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve shared log' } });
    }
});

// GET /api/share/image/:token — serves the image attached to a shared log
router.get('/image/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!/^[0-9a-f]{64}$/.test(token)) {
            return res.status(404).json({ success: false, error: { message: 'Shared log not found' } });
        }

        const log = await db.getSharedLog(token);
        if (!log) {
            return res.status(404).json({ success: false, error: { message: 'Shared log not found' } });
        }

        // URL-type images: redirect to the external URL
        if (log.image_type === 'url' && log.image_url) {
            return res.redirect(302, log.image_url);
        }

        if (!log.image_filename) {
            return res.status(404).json({ success: false, error: { message: 'No image attached to this log' } });
        }

        // Prevent path traversal — filename should be a plain hex+extension string
        const filename = path.basename(log.image_filename);
        const filePath = path.join(uploadsDir, filename);

        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: { message: 'Image file not found' } });
        }

        // Public images: cache for 24h (they never change)
        res.setHeader('Content-Type', log.image_mime_type || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Serve shared image error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to serve image' } });
    }
});

// GET /api/share/range/:token — returns all logs + comments for a shared date range
router.get('/range/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!/^[A-Za-z0-9_-]{22}$/.test(token)) {
            return res.status(404).json({ success: false, error: { message: 'Shared range not found' } });
        }

        const meta = await db.getRangeShareMeta(token);
        if (!meta) {
            return res.status(404).json({ success: false, error: { message: 'Shared range not found' } });
        }

        const [logs, comments] = await Promise.all([
            db.getRangeShareLogs(meta.user_id, meta.date_from, meta.date_to),
            db.getRangeShareComments(meta.user_id, meta.date_from, meta.date_to)
        ]);

        // Group logs by date, resolve image URLs, strip internal fields
        const data = {};
        for (const log of logs) {
            const date = log.log_date;
            if (!data[date]) {
                data[date] = { logs: [], total_calories: 0 };
            }
            // Build a public image URL if an uploaded image is attached;
            // external URL images are passed through directly.
            let publicImageUrl = null;
            if (log.image_id) {
                if (log.image_type === 'url' && log.image_url) {
                    publicImageUrl = log.image_url;
                } else if (log.image_filename) {
                    publicImageUrl = `/api/share/range/${token}/image/${log.id}`;
                }
            }
            data[date].logs.push({
                id:            log.id,
                food_name:     log.food_name,
                quantity:      log.quantity,
                unit:          log.unit,
                calories:      log.calories,
                meal_category: log.meal_category,
                meal_time:     log.meal_time,
                protein:       log.protein,
                carbs:         log.carbs,
                fat:           log.fat,
                image_url:     publicImageUrl
            });
            data[date].total_calories += parseFloat(log.calories);
        }

        // Attach comments
        for (const c of comments) {
            const date = c.log_date;
            if (data[date]) {
                data[date].comment = c.comment;
            } else {
                data[date] = { logs: [], total_calories: 0, comment: c.comment };
            }
        }

        res.json({
            success: true,
            shared_by: meta.username,
            date_from: meta.date_from,
            date_to: meta.date_to,
            data
        });
    } catch (error) {
        console.error('Get shared range error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve shared range' } });
    }
});

// GET /api/share/range/:token/image/:logId — serves an uploaded image for a range-shared log
router.get('/range/:token/image/:logId', async (req, res) => {
    try {
        const { token, logId } = req.params;

        if (!/^[A-Za-z0-9_-]{22}$/.test(token) || !/^\d+$/.test(logId)) {
            return res.status(404).json({ success: false, error: { message: 'Not found' } });
        }

        const meta = await db.getRangeShareMeta(token);
        if (!meta) {
            return res.status(404).json({ success: false, error: { message: 'Shared range not found' } });
        }

        // Confirm the log belongs to this range share's owner and date range
        const rows = await db.query(
            `SELECT fl.image_id, img.filename, img.mime_type, img.type, img.url
             FROM food_logs fl
             LEFT JOIN images img ON fl.image_id = img.id
             WHERE fl.id = ? AND fl.user_id = ?
               AND fl.log_date BETWEEN ? AND ?`,
            [logId, meta.user_id, meta.date_from, meta.date_to]
        );
        const row = rows[0];
        if (!row || !row.image_id) {
            return res.status(404).json({ success: false, error: { message: 'Image not found' } });
        }

        if (row.type === 'url' && row.url) {
            return res.redirect(302, row.url);
        }

        if (!row.filename) {
            return res.status(404).json({ success: false, error: { message: 'Image file not found' } });
        }

        const filename = path.basename(row.filename);
        const filePath = path.join(uploadsDir, filename);

        if (!fsSync.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: { message: 'Image file not found' } });
        }

        res.setHeader('Content-Type', row.mime_type || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Serve range share image error:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to serve image' } });
    }
});

module.exports = router;
