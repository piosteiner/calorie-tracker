'use strict';

/**
 * routes/push.js
 *
 * POST   /api/push/subscription  — save a new push subscription
 * DELETE /api/push/subscription  — remove a push subscription by endpoint
 * GET    /api/push/vapid-public-key — return the VAPID public key so the
 *                                    frontend can call PushManager.subscribe()
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database');
const { getConfig } = require('../config/env');

const router = express.Router();
const config = getConfig();

// ── Public: VAPID public key (needed by the frontend before subscribing) ─────

router.get('/vapid-public-key', function (_req, res) {
    if (!config.vapid.publicKey) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: config.vapid.publicKey });
});

// ── All subscription routes require authentication ────────────────────────────
router.use(authenticateToken);

// POST /api/push/subscription
router.post(
    '/subscription',
    [
        body('endpoint').isURL({ require_tld: false }).withMessage('endpoint must be a valid URL'),
        body('keys.p256dh').isString().notEmpty().withMessage('keys.p256dh is required'),
        body('keys.auth').isString().notEmpty().withMessage('keys.auth is required')
    ],
    async function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { endpoint, keys, userAgent } = req.body;
        const { p256dh, auth } = keys;

        // Upsert: update keys in case they rotated for the same endpoint
        await db.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh),
                                     auth   = VALUES(auth),
                                     user_agent = VALUES(user_agent),
                                     updated_at = NOW()`,
            [req.user.id, endpoint, p256dh, auth, userAgent || null]
        );

        res.status(201).json({ success: true, message: 'Push subscription saved' });
    }
);

// DELETE /api/push/subscription
router.delete(
    '/subscription',
    [
        body('endpoint').isURL({ require_tld: false }).withMessage('endpoint must be a valid URL')
    ],
    async function (req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { endpoint } = req.body;

        await db.query(
            'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
            [req.user.id, endpoint]
        );

        res.json({ success: true, message: 'Push subscription removed' });
    }
);

module.exports = router;
