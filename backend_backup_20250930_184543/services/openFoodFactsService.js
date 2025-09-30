const axios = require('axios');

class OpenFoodFactsService {
    constructor() {
        this.baseURL = 'https://world.openfoodfacts.org';
        this.userAgent = process.env.OPEN_FOOD_FACTS_USER_AGENT || 'CalorieTracker/1.0 (contact@piogino.ch)';
        this.timeout = parseInt(process.env.OPEN_FOOD_FACTS_TIMEOUT) || 10000;
    }

    // Search foods by query
    async searchFoods(query, limit = 20, country = 'switzerland') {
        try {
            const response = await axios.get(`${this.baseURL}/cgi/search.pl`, {
                params: {
                    search_terms: query,
                    page_size: limit,
                    json: 1,
                    fields: 'product_name,nutriments,quantity,brands,countries,_id,image_url',
                    countries: country
                },
                headers: {
                    'User-Agent': this.userAgent
                },
                timeout: this.timeout
            });

            return this.processProducts(response.data.products || []);
        } catch (error) {
            console.error('Open Food Facts search error:', error.message);
            return [];
        }
    }

    // Get specific product by barcode
    async getProduct(barcode) {
        try {
            const response = await axios.get(`${this.baseURL}/api/v0/product/${barcode}.json`, {
                headers: {
                    'User-Agent': this.userAgent
                },
                timeout: this.timeout
            });

            if (response.data.status === 1) {
                return this.processProducts([response.data.product])[0] || null;
            }
            return null;
        } catch (error) {
            console.error('Open Food Facts product error:', error.message);
            return null;
        }
    }

    // Process and normalize product data
    processProducts(products) {
        return products
            .filter(product => 
                product.product_name && 
                product.nutriments && 
                product.nutriments['energy-kcal_100g'] &&
                product.nutriments['energy-kcal_100g'] > 0
            )
            .map(product => ({
                external_id: product._id,
                name: this.cleanProductName(product.product_name),
                calories_per_100g: Math.round(product.nutriments['energy-kcal_100g'] || 0),
                protein_per_100g: this.parseNutriment(product.nutriments.proteins_100g),
                carbs_per_100g: this.parseNutriment(product.nutriments.carbohydrates_100g),
                fat_per_100g: this.parseNutriment(product.nutriments.fat_100g),
                fiber_per_100g: this.parseNutriment(product.nutriments.fiber_100g),
                brand: this.cleanBrand(product.brands),
                countries: product.countries || '',
                image_url: product.image_url || null,
                source: 'Open Food Facts'
            }))
            .filter(product => product.calories_per_100g > 0); // Filter out invalid entries
    }

    // Clean and standardize product names
    cleanProductName(name) {
        if (!name) return '';
        return name
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .substring(0, 255); // Limit length to database constraint
    }

    // Clean and extract first brand
    cleanBrand(brands) {
        if (!brands) return null;
        const firstBrand = brands.split(',')[0].trim();
        return firstBrand.length > 0 ? firstBrand.substring(0, 255) : null;
    }

    // Parse nutriment values safely
    parseNutriment(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : Math.round(parsed * 100) / 100; // Round to 2 decimal places
    }

    // Search with Swiss/European priority
    async searchSwissFoods(query, limit = 20) {
        const results = [];
        const seen = new Set(); // Track seen products to avoid duplicates
        
        try {
            // First search Swiss products
            console.log(`Searching Swiss foods for: ${query}`);
            const swissResults = await this.searchFoods(query, Math.ceil(limit / 2), 'switzerland');
            for (const result of swissResults) {
                if (!seen.has(result.external_id)) {
                    results.push(result);
                    seen.add(result.external_id);
                }
            }
            
            // Then search broader European products if we need more
            if (results.length < limit) {
                console.log(`Searching European foods for: ${query}`);
                const europeanResults = await this.searchFoods(query, limit - results.length, 'germany,france,italy,austria');
                for (const result of europeanResults) {
                    if (!seen.has(result.external_id)) {
                        results.push(result);
                        seen.add(result.external_id);
                    }
                }
            }
            
            // Finally global search if still not enough
            if (results.length < limit) {
                console.log(`Searching global foods for: ${query}`);
                const globalResults = await this.searchFoods(query, limit - results.length, '');
                for (const result of globalResults) {
                    if (!seen.has(result.external_id)) {
                        results.push(result);
                        seen.add(result.external_id);
                    }
                }
            }
            
            return results.slice(0, limit);
        } catch (error) {
            console.error('Swiss foods search error:', error);
            return results; // Return partial results if available
        }
    }

    // Get detailed nutrition information for a product
    async getDetailedNutrition(externalId) {
        try {
            const product = await this.getProduct(externalId);
            if (!product) return null;

            return {
                ...product,
                nutrition_score: this.calculateNutritionScore(product),
                allergens: this.extractAllergens(product),
                additives_count: product.additives_n || 0,
                nova_group: product.nova_group || null
            };
        } catch (error) {
            console.error('Detailed nutrition error:', error);
            return null;
        }
    }

    // Calculate simple nutrition score (0-100, higher is better)
    calculateNutritionScore(product) {
        let score = 50; // Base score
        
        // Protein bonus
        if (product.protein_per_100g > 10) score += 10;
        else if (product.protein_per_100g > 5) score += 5;
        
        // Fiber bonus
        if (product.fiber_per_100g > 5) score += 10;
        else if (product.fiber_per_100g > 2) score += 5;
        
        // Fat penalty for high fat
        if (product.fat_per_100g > 20) score -= 10;
        else if (product.fat_per_100g > 35) score -= 20;
        
        // Calorie density penalty
        if (product.calories_per_100g > 400) score -= 15;
        else if (product.calories_per_100g > 300) score -= 10;
        else if (product.calories_per_100g > 200) score -= 5;
        
        return Math.max(0, Math.min(100, score));
    }

    // Extract allergen information (if available)
    extractAllergens(product) {
        if (!product.allergens) return [];
        return product.allergens.split(',').map(a => a.trim()).filter(a => a.length > 0);
    }

    // Health check for the service
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseURL}/api/v0/product/3017620422003.json`, {
                headers: { 'User-Agent': this.userAgent },
                timeout: 3000
            });
            return response.status === 200;
        } catch (error) {
            console.error('Open Food Facts health check failed:', error.message);
            return false;
        }
    }
}

module.exports = new OpenFoodFactsService();