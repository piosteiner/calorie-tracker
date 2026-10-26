/**
 * imageCleanup.js
 * 
 * Runs daily at 03:00 and permanently deletes uploaded images (and their
 * database records) that are older than 300 days.
 */

const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;
const db = require('../database');

const uploadsDir = path.join(__dirname, '../uploads/images');
const MAX_AGE_DAYS = 300;

async function deleteExpiredImages() {
    console.log('[imageCleanup] Starting expired image cleanup...');

    try {
        // Find all uploaded images older than MAX_AGE_DAYS
        const expired = await db.query(
            `SELECT id, filename FROM images
             WHERE type = 'uploaded'
               AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [MAX_AGE_DAYS]
        );

        if (expired.length === 0) {
            console.log('[imageCleanup] No expired images found.');
            return;
        }

        let deletedFiles = 0;
        let deletedRecords = 0;

        for (const image of expired) {
            // Delete the physical file first
            if (image.filename) {
                try {
                    await fs.unlink(path.join(uploadsDir, image.filename));
                    deletedFiles++;
                } catch (fileError) {
                    // File may already be missing — still remove the DB record
                    if (fileError.code !== 'ENOENT') {
                        console.error(`[imageCleanup] Failed to delete file ${image.filename}:`, fileError.message);
                    }
                }
            }

            // Remove the database record
            await db.query('DELETE FROM images WHERE id = ?', [image.id]);
            deletedRecords++;
        }

        console.log(
            `[imageCleanup] Done. Deleted ${deletedFiles} file(s) and ${deletedRecords} record(s).`
        );
    } catch (error) {
        console.error('[imageCleanup] Cleanup job failed:', error.message);
    }
}

function start() {
    // Run daily at 03:00
    cron.schedule('0 3 * * *', deleteExpiredImages, { timezone: 'UTC' });
    console.log(`[imageCleanup] Scheduled: images older than ${MAX_AGE_DAYS} days deleted daily at 03:00 UTC`);
}

module.exports = { start, deleteExpiredImages };
