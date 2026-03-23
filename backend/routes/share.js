const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const db       = require('../database');

const router   = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../uploads');

// ── Public: no auth required ──────────────────────────────────────────────────

// GET /log/:token — return log metadata as JSON (food name, calories, date, image url, username)
router.get('/log/:token', async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT
                fl.id,
                fl.share_token,
                COALESCE(fl.name, f.name) AS food_name,
                fl.quantity,
                fl.unit,
                fl.calories,
                fl.log_date,
                fl.meal_category,
                fl.meal_time,
                fl.image_id,
                img.filename   AS image_filename,
                img.type       AS image_type,
                img.url        AS image_url,
                u.username
             FROM food_logs fl
             LEFT JOIN foods    f   ON fl.food_id  = f.id
             LEFT JOIN images  img  ON fl.image_id = img.id
             LEFT JOIN users    u   ON fl.user_id  = u.id
             WHERE fl.share_token = ?`,
            [req.params.token]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Shared log not found or link has been revoked' });
        }

        const log = rows[0];

        // Build a public image URL if there is one
        let publicImageUrl = null;
        if (log.image_id) {
            publicImageUrl = `/api/share/image/${log.share_token}`;
        }

        res.json({
            success: true,
            log: {
                id:           log.id,
                food_name:    log.food_name,
                quantity:     log.quantity,
                unit:         log.unit,
                calories:     log.calories,
                log_date:     log.log_date,
                meal_category: log.meal_category,
                meal_time:    log.meal_time,
                image_url:    publicImageUrl,
                shared_by:    log.username
            }
        });
    } catch (err) {
        console.error('Share log fetch error:', err);
        res.status(500).json({ error: 'Failed to retrieve shared log' });
    }
});

// GET /image/:token — serve the image attached to a shared log entry
router.get('/image/:token', async (req, res) => {
    try {
        const rows = await db.query(
            `SELECT img.filename, img.mime_type, img.type, img.url
             FROM food_logs fl
             JOIN images img ON fl.image_id = img.id
             WHERE fl.share_token = ?`,
            [req.params.token]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Image not found or link has been revoked' });
        }

        const image = rows[0];

        if (image.type === 'url') {
            return res.redirect(302, image.url);
        }

        const filePath = path.join(UPLOAD_DIR, image.filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Image file not found' });
        }

        res.setHeader('Content-Type', image.mime_type || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(filePath);
    } catch (err) {
        console.error('Share image serve error:', err);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

module.exports = router;
