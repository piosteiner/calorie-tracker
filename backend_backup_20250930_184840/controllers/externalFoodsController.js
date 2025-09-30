const db = require('../database');
const openFoodFactsService = require('../services/openFoodFactsService');

class ExternalFoodsController {
    // Search foods from external sources
    async searchExternalFoods(req, res) {
        try {
            const { q: query, limit = 10, source = 'openfoodfacts' } = req.query;
            
            if (!query || query.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Query must be at least 2 characters'
                });
            }

            let results = [];
            
            if (source === 'openfoodfacts') {
                // Check cache first
                const cachedResults = await this.getCachedFoods(query, Math.ceil(limit / 2));
                
                if (cachedResults.length >= limit) {
                    results = cachedResults;
                } else {
                    // Search Open Food Facts
                    const externalResults = await openFoodFactsService.searchSwissFoods(query, limit);
                    
                    // Cache popular results asynchronously
                    this.cacheSearchResults(externalResults).catch(err => 
                        console.error('Caching error:', err)
                    );
                    
                    // Combine cached + new results, prioritizing cached ones
                    const combinedResults = [...cachedResults];
                    for (const result of externalResults) {
                        if (!combinedResults.find(cached => cached.external_id === result.external_id)) {
                            combinedResults.push(result);
                        }
                    }
                    
                    results = combinedResults.slice(0, limit);
                }
            }

            res.json({
                success: true,
                foods: results,
                source: source,
                cached: results.length > 0 && results[0].cached_at ? true : false,
                count: results.length
            });

        } catch (error) {
            console.error('External foods search error:', error);
            res.status(500).json({
                success: false,
                message: 'Error searching external foods'
            });
        }
    }

    // Log external food consumption
    async logExternalFood(req, res) {
        try {
            const userId = req.user.id;
            const {
                external_food_id,
                name,
                quantity,
                unit = 'g',
                calories,
                brand,
                protein_per_100g,
                carbs_per_100g,
                fat_per_100g,
                fiber_per_100g,
                source = 'Open Food Facts',
                log_date
            } = req.body;

            // Validation
            if (!external_food_id || !name || !quantity || !calories) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: external_food_id, name, quantity, calories'
                });
            }

            // Get or create external source
            const sourceId = await this.getExternalSourceId(source);

            // Use current date if not provided
            const logDate = log_date || new Date().toISOString().split('T')[0];

            // Insert food log
            const result = await db.query(`
                INSERT INTO food_logs (
                    user_id, external_food_id, external_source_id, name, 
                    quantity, unit, calories, brand,
                    protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                    log_date, logged_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                userId, external_food_id, sourceId, name,
                quantity, unit, calories, brand || null,
                protein_per_100g || null, carbs_per_100g || null, fat_per_100g || null, fiber_per_100g || null,
                logDate
            ]);

            // Update cache usage count asynchronously
            this.updateCacheUsage(external_food_id, sourceId).catch(err => 
                console.error('Cache usage update error:', err)
            );

            res.json({
                success: true,
                logId: result.insertId,
                message: 'External food logged successfully'
            });

        } catch (error) {
            console.error('External food logging error:', error);
            res.status(500).json({
                success: false,
                message: 'Error logging external food'
            });
        }
    }

    // Get cached foods
    async getCachedFoods(query, limit) {
        try {
            const searchQuery = `%${query.toLowerCase()}%`;
            const rows = await db.query(`
                SELECT cef.*, efs.name as source_name
                FROM cached_external_foods cef
                JOIN external_food_sources efs ON cef.external_source_id = efs.id
                WHERE LOWER(cef.name) LIKE ? 
                   OR LOWER(COALESCE(cef.brand, '')) LIKE ?
                ORDER BY cef.usage_count DESC, cef.cached_at DESC
                LIMIT ?
            `, [searchQuery, searchQuery, parseInt(limit)]);

            return rows.map(row => ({
                external_id: row.external_id,
                name: row.name,
                calories_per_100g: row.calories_per_100g,
                unit: 'g', // Standard unit is grams
                protein_per_100g: row.protein_per_100g,
                carbs_per_100g: row.carbs_per_100g,
                fat_per_100g: row.fat_per_100g,
                fiber_per_100g: row.fiber_per_100g,
                brand: row.brand,
                countries: row.countries,
                source: row.source_name,
                cached_at: row.cached_at,
                usage_count: row.usage_count
            }));
        } catch (error) {
            console.error('Cache retrieval error:', error);
            return [];
        }
    }

    // Cache search results
    async cacheSearchResults(foods) {
        if (!foods || foods.length === 0) return;
        
        try {
            for (const food of foods) {
                const sourceId = await this.getExternalSourceId(food.source);
                
                await db.query(`
                    INSERT INTO cached_external_foods (
                        external_id, external_source_id, name, calories_per_100g,
                        protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                        brand, countries, cached_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                        usage_count = usage_count + 1,
                        cached_at = NOW(),
                        name = VALUES(name),
                        calories_per_100g = VALUES(calories_per_100g),
                        protein_per_100g = VALUES(protein_per_100g),
                        carbs_per_100g = VALUES(carbs_per_100g),
                        fat_per_100g = VALUES(fat_per_100g),
                        fiber_per_100g = VALUES(fiber_per_100g),
                        brand = VALUES(brand),
                        countries = VALUES(countries)
                `, [
                    food.external_id, sourceId, food.name, food.calories_per_100g,
                    food.protein_per_100g, food.carbs_per_100g, food.fat_per_100g, food.fiber_per_100g,
                    food.brand, food.countries
                ]);
            }
        } catch (error) {
            console.error('Caching error:', error);
        }
    }

    // Get external source ID
    async getExternalSourceId(sourceName) {
        try {
            const rows = await db.query(
                'SELECT id FROM external_food_sources WHERE name = ?',
                [sourceName]
            );
            return rows[0]?.id || 1; // Default to Open Food Facts (assuming it's ID 1)
        } catch (error) {
            console.error('Source ID error:', error);
            return 1;
        }
    }

    // Update cache usage
    async updateCacheUsage(externalId, sourceId) {
        try {
            await db.query(`
                UPDATE cached_external_foods 
                SET usage_count = usage_count + 1,
                    cached_at = NOW()
                WHERE external_id = ? AND external_source_id = ?
            `, [externalId, sourceId]);
        } catch (error) {
            console.error('Cache update error:', error);
        }
    }

    // Get product details by external ID
    async getExternalFoodDetails(req, res) {
        try {
            const { id: externalId } = req.params;
            const { source = 'openfoodfacts' } = req.query;

            if (!externalId) {
                return res.status(400).json({
                    success: false,
                    message: 'External food ID is required'
                });
            }

            let product = null;

            // Try cache first
            const cachedProduct = await this.getCachedFoodById(externalId);
            if (cachedProduct) {
                product = cachedProduct;
            } else if (source === 'openfoodfacts') {
                // Fetch from API
                product = await openFoodFactsService.getProduct(externalId);
                
                // Cache the result
                if (product) {
                    await this.cacheSearchResults([product]);
                }
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.json({
                success: true,
                product
            });

        } catch (error) {
            console.error('External food details error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching product details'
            });
        }
    }

    // Get cached food by ID
    async getCachedFoodById(externalId) {
        try {
            const rows = await db.query(`
                SELECT cef.*, efs.name as source_name
                FROM cached_external_foods cef
                JOIN external_food_sources efs ON cef.external_source_id = efs.id
                WHERE cef.external_id = ?
                LIMIT 1
            `, [externalId]);

            if (rows.length === 0) return null;

            const row = rows[0];
            return {
                external_id: row.external_id,
                name: row.name,
                calories_per_100g: row.calories_per_100g,
                protein_per_100g: row.protein_per_100g,
                carbs_per_100g: row.carbs_per_100g,
                fat_per_100g: row.fat_per_100g,
                fiber_per_100g: row.fiber_per_100g,
                brand: row.brand,
                countries: row.countries,
                source: row.source_name,
                cached_at: row.cached_at,
                usage_count: row.usage_count
            };
        } catch (error) {
            console.error('Cached food retrieval error:', error);
            return null;
        }
    }

    // Admin: Get external food statistics
    async getExternalFoodStats(req, res) {
        try {
            const [usageStats] = await Promise.all([
                db.query(`
                    SELECT 
                        efs.name as source_name,
                        COUNT(DISTINCT fl.external_food_id) as unique_foods,
                        COUNT(fl.id) as total_logs,
                        SUM(fl.calories) as total_calories,
                        AVG(fl.calories) as avg_calories_per_log
                    FROM food_logs fl
                    JOIN external_food_sources efs ON fl.external_source_id = efs.id
                    WHERE fl.external_food_id IS NOT NULL
                    GROUP BY fl.external_source_id, efs.name
                `)
            ]);

            const [cacheStats] = await Promise.all([
                db.query(`
                    SELECT 
                        efs.name as source_name,
                        COUNT(*) as cached_foods,
                        SUM(cef.usage_count) as total_usage,
                        AVG(cef.usage_count) as avg_usage_per_food,
                        MAX(cef.cached_at) as last_cached
                    FROM cached_external_foods cef
                    JOIN external_food_sources efs ON cef.external_source_id = efs.id
                    GROUP BY cef.external_source_id, efs.name
                `)
            ]);

            const [recentLogs] = await Promise.all([
                db.query(`
                    SELECT 
                        fl.name,
                        fl.brand,
                        fl.calories,
                        fl.logged_at,
                        u.username
                    FROM food_logs fl
                    JOIN users u ON fl.user_id = u.id
                    WHERE fl.external_food_id IS NOT NULL
                    ORDER BY fl.logged_at DESC
                    LIMIT 10
                `)
            ]);

            res.json({
                success: true,
                usage_stats: usageStats,
                cache_stats: cacheStats,
                recent_logs: recentLogs
            });

        } catch (error) {
            console.error('External food stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting external food statistics'
            });
        }
    }

    // Health check for external services
    async healthCheck(req, res) {
        try {
            const openFoodFactsStatus = await openFoodFactsService.healthCheck();
            
            res.json({
                success: true,
                services: {
                    open_food_facts: openFoodFactsStatus ? 'healthy' : 'unhealthy'
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('External services health check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking external services health'
            });
        }
    }
}

module.exports = new ExternalFoodsController();