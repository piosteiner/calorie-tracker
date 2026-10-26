'use strict';

/**
 * services/pushService.js
 *
 * Thin wrapper around the `web-push` package.
 * Initialises VAPID credentials once at require-time and exposes helpers for:
 *   - sending a notification to a single subscription row
 *   - sending a notification to ALL subscriptions belonging to a user
 *   - pruning dead/expired subscriptions (410 Gone) automatically
 */

const webpush = require('web-push');
const db      = require('../database');

const { getConfig } = require('../config/env');
const config = getConfig();

if (config.vapid.publicKey && config.vapid.privateKey && config.vapid.subject) {
    webpush.setVapidDetails(
        config.vapid.subject,
        config.vapid.publicKey,
        config.vapid.privateKey
    );
} else {
    console.warn('[pushService] VAPID keys not configured — push notifications disabled.');
}

/**
 * Send a Web Push notification to a single push_subscriptions row.
 *
 * @param {{ id, endpoint, p256dh, auth }} sub  Row from push_subscriptions table.
 * @param {{ title, body, icon, badge, data }} payload
 * @returns {Promise<boolean>}  true = delivered, false = subscription expired/invalid
 */
async function sendToSubscription(sub, payload) {
    if (!config.vapid.publicKey) return false;

    const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
    };

    try {
        await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
            { TTL: 86400 } // deliver within 24 h, then discard
        );
        return true;
    } catch (err) {
        // 404 / 410 means the subscription is no longer valid — remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
            await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
        } else {
            console.error('[pushService] Delivery error for sub %d: %s', sub.id, err.message);
        }
        return false;
    }
}

/**
 * Send a notification to every device a user has subscribed.
 *
 * @param {number} userId
 * @param {{ title, body, icon, badge, data }} payload
 * @returns {Promise<number>}  Count of successful deliveries
 */
async function notifyUser(userId, payload) {
    const subs = await db.query(
        'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
        [userId]
    );

    if (subs.length === 0) return 0;

    const results = await Promise.all(subs.map(sub => sendToSubscription(sub, payload)));
    return results.filter(Boolean).length;
}

module.exports = { sendToSubscription, notifyUser };
