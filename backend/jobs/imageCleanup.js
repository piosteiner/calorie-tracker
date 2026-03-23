const cron = require('node-cron');
const path = require('path');
const fs   = require('fs');
const db   = require('../database');

const UPLOAD_DIR      = path.join(__dirname, '../uploads');
const RETENTION_DAYS  = 300;

async function runCleanup() {
    console.log('[imageCleanup] Running cleanup for images older than', RETENTION_DAYS, 'days...');

    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
        const cutoffStr = cutoff.toISOString().slice(0, 19).replace('T', ' ');

        // Only delete file-based uploads, never URL-type images
        const stale = await db.query(
            `SELECT id, filename FROM images
             WHERE type = 'upload' AND created_at < ?`,
            [cutoffStr]
        );

        if (stale.length === 0) {
            console.log('[imageCleanup] Nothing to clean up.');
            return;
        }

        const ids = stale.map(img => img.id);

        // Detach from food_logs first
        await db.query(
            `UPDATE food_logs SET image_id = NULL WHERE image_id IN (${ids.map(() => '?').join(',')})`,
            ids
        );

        // Delete DB records
        await db.query(
            `DELETE FROM images WHERE id IN (${ids.map(() => '?').join(',')})`,
            ids
        );

        // Delete files from disk
        let deleted = 0;
        for (const img of stale) {
            const filePath = path.join(UPLOAD_DIR, img.filename);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, err => {
                    if (err) console.error('[imageCleanup] Failed to delete file:', filePath, err);
                });
                deleted++;
            }
        }

        console.log(`[imageCleanup] Removed ${deleted} file(s) (${stale.length} DB record(s))`);
    } catch (err) {
        console.error('[imageCleanup] Error during cleanup:', err);
    }
}

function start() {
    // Run daily at 03:00 UTC
    cron.schedule('0 3 * * *', runCleanup, { timezone: 'UTC' });
    console.log('[imageCleanup] Scheduled daily at 03:00 UTC');
}

module.exports = { start, runCleanup };
