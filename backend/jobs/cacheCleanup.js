const cron = require('node-cron');
const db = require('../database');

class CacheCleanupJob {
    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.enabled = process.env.CACHE_CLEANUP_ENABLED !== 'false';
    }

    // Start the cache cleanup scheduler
    start() {
        if (!this.enabled) {
            console.log('Cache cleanup job is disabled');
            return;
        }

        // Run daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            await this.runCleanup();
        });

        // Also run weekly cleanup on Sundays at 3 AM
        cron.schedule('0 3 * * 0', async () => {
            await this.runWeeklyCleanup();
        });

        console.log('Cache cleanup jobs scheduled');
    }

    // Daily cache cleanup
    async runCleanup() {
        if (this.isRunning) {
            console.log('Cache cleanup already running, skipping...');
            return;
        }

        this.isRunning = true;
        this.lastRun = new Date();

        try {
            console.log('Starting daily cache cleanup...');
            
            const results = await Promise.all([
                this.removeOldUnusedCache(),
                this.limitCacheSize(),
                this.updateCacheStats()
            ]);

            console.log('Daily cache cleanup completed:', {
                oldEntriesRemoved: results[0],
                excessEntriesRemoved: results[1],
                statsUpdated: results[2]
            });

        } catch (error) {
            console.error('Daily cache cleanup error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    // Weekly cache cleanup (more aggressive)
    async runWeeklyCleanup() {
        if (this.isRunning) {
            console.log('Cache cleanup already running, skipping weekly cleanup...');
            return;
        }

        this.isRunning = true;

        try {
            console.log('Starting weekly cache cleanup...');
            
            const results = await Promise.all([
                this.removeVeryOldCache(),
                this.optimizeCacheStorage(),
                this.cleanupOrphanedRecords()
            ]);

            console.log('Weekly cache cleanup completed:', {
                veryOldEntriesRemoved: results[0],
                storageOptimized: results[1],
                orphanedRecordsRemoved: results[2]
            });

        } catch (error) {
            console.error('Weekly cache cleanup error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    // Remove cache entries older than 30 days with low usage
    async removeOldUnusedCache() {
        try {
            const result = await db.query(`
                DELETE FROM cached_external_foods 
                WHERE cached_at < DATE_SUB(NOW(), INTERVAL 30 DAY) 
                AND usage_count < 5
            `);
            
            return result.affectedRows || 0;
        } catch (error) {
            console.error('Error removing old unused cache:', error);
            return 0;
        }
    }

    // Keep only top 2000 most used cached foods
    async limitCacheSize() {
        try {
            const result = await db.query(`
                DELETE FROM cached_external_foods 
                WHERE id NOT IN (
                    SELECT id FROM (
                        SELECT id FROM cached_external_foods 
                        ORDER BY usage_count DESC, cached_at DESC 
                        LIMIT 2000
                    ) temp
                )
            `);
            
            return result.affectedRows || 0;
        } catch (error) {
            console.error('Error limiting cache size:', error);
            return 0;
        }
    }

    // Remove very old cache entries (older than 90 days)
    async removeVeryOldCache() {
        try {
            const result = await db.query(`
                DELETE FROM cached_external_foods 
                WHERE cached_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
            `);
            
            return result.affectedRows || 0;
        } catch (error) {
            console.error('Error removing very old cache:', error);
            return 0;
        }
    }

    // Optimize cache storage by updating frequently used items
    async optimizeCacheStorage() {
        try {
            // Reset usage count for items not used in last 7 days
            const result = await db.query(`
                UPDATE cached_external_foods 
                SET usage_count = GREATEST(1, FLOOR(usage_count * 0.8))
                WHERE cached_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND usage_count > 10
            `);
            
            return result.affectedRows || 0;
        } catch (error) {
            console.error('Error optimizing cache storage:', error);
            return 0;
        }
    }

    // Clean up orphaned records
    async cleanupOrphanedRecords() {
        try {
            // Remove cached foods with inactive external sources
            const result = await db.query(`
                DELETE cef FROM cached_external_foods cef
                LEFT JOIN external_food_sources efs ON cef.external_source_id = efs.id
                WHERE efs.id IS NULL OR efs.is_active = FALSE
            `);
            
            return result.affectedRows || 0;
        } catch (error) {
            console.error('Error cleaning orphaned records:', error);
            return 0;
        }
    }

    // Update cache statistics
    async updateCacheStats() {
        try {
            // This could store cache statistics in a separate table if needed
            // For now, just log current cache status
            const stats = await db.query(`
                SELECT 
                    COUNT(*) as total_cached_foods,
                    AVG(usage_count) as avg_usage_count,
                    MAX(usage_count) as max_usage_count,
                    COUNT(CASE WHEN cached_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_cached
                FROM cached_external_foods
            `);

            if (stats.length > 0) {
                console.log('Cache statistics:', stats[0]);
            }

            return true;
        } catch (error) {
            console.error('Error updating cache stats:', error);
            return false;
        }
    }

    // Manual cleanup trigger (for admin use)
    async runManualCleanup() {
        if (this.isRunning) {
            throw new Error('Cleanup already in progress');
        }

        console.log('Running manual cache cleanup...');
        await this.runCleanup();
        return {
            success: true,
            lastRun: this.lastRun,
            message: 'Manual cache cleanup completed'
        };
    }

    // Get cleanup status
    getStatus() {
        return {
            enabled: this.enabled,
            isRunning: this.isRunning,
            lastRun: this.lastRun
        };
    }

    // Stop all scheduled jobs (for graceful shutdown)
    stop() {
        cron.getTasks().forEach(task => task.destroy());
        console.log('Cache cleanup jobs stopped');
    }
}

module.exports = new CacheCleanupJob();