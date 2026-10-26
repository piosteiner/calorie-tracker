/**
 * shareTokenCleanup.js
 *
 * Runs daily at 03:30 UTC and NULLs out share tokens that are older than
 * MAX_AGE_DAYS days. The food log itself is kept; only the public share link
 * is revoked. Users can always generate a new link.
 */

const cron = require('node-cron');
const db = require('../database');

const MAX_AGE_DAYS = 30;

async function expireOldShareTokens() {
    console.log('[shareTokenCleanup] Starting expired share token cleanup...');

    try {
        const [perLogResult, rangeResult] = await Promise.all([
            db.query(
                `UPDATE food_logs
                 SET share_token = NULL, share_token_created_at = NULL
                 WHERE share_token IS NOT NULL
                   AND share_token_created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
                [MAX_AGE_DAYS]
            ),
            db.query(
                'DELETE FROM share_ranges WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
                [MAX_AGE_DAYS]
            )
        ]);

        console.log(
            `[shareTokenCleanup] Done. Revoked ${perLogResult.affectedRows} per-log token(s), ` +
            `deleted ${rangeResult.affectedRows} range share(s).`
        );
    } catch (error) {
        console.error('[shareTokenCleanup] Cleanup job failed:', error.message);
    }
}

function start() {
    // Run daily at 03:30 UTC (offset from imageCleanup to spread DB load)
    cron.schedule('30 3 * * *', expireOldShareTokens, { timezone: 'UTC' });
    console.log(`[shareTokenCleanup] Scheduled: share tokens older than ${MAX_AGE_DAYS} days revoked daily at 03:30 UTC`);
}

module.exports = { start, expireOldShareTokens };
