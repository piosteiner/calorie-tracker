/**
 * FoodSearchService.js
 * Handles food search logic including local DB, enhanced API search, caching, and debouncing
 */

import { logger } from '../../logger.js';
import { CONFIG } from '../../config.js';
import { apiService } from '../api/ApiService.js';
import { stateManager } from './StateManager.js';

export class FoodSearchService {
    constructor() {
        this.isSearching = false;
        this.debounceTimeout = null;
        this.selectedSuggestionIndex = -1;
        this.openFoodFactsCache = new Map();
        
        // Database toggle preferences
        this.searchPreferences = {
            favorites: true,
            localFoods: true,
            enhancedSearch: false
        };
    }

    /**
     * Initialize search service
     */
    init() {
        this.loadSearchPreferences();
        stateManager.loadCachedSearches();
        logger.info('FoodSearchService initialized');
    }

    /**
     * Search for foods with debouncing
     * @param {string} input - Search input
     * @param {Function} callback - Callback to receive results
     * @param {number} delay - Debounce delay in ms
     */
    debouncedSearch(input, callback, delay = CONFIG.TIMING.DEBOUNCE_DELAY) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.searchFoods(input).then(callback);
        }, delay);
    }

    /**
     * Main search method - orchestrates all search sources
     * @param {string} input - Search query
     * @returns {Promise<Array>} Array of food results
     */
    async searchFoods(input) {
        // Prevent concurrent searches
        if (this.isSearching) {
            logger.debug('Search already in progress, skipping');
            return [];
        }

        const query = input.trim().toLowerCase();
        if (!query || query.length < 2) {
            logger.debug('Search query too short');
            return [];
        }

        this.isSearching = true;
        logger.info('🔍 Starting search for:', query);

        try {
            let matches = [];

            // 1. Search favorites first (instant results)
            if (this.searchPreferences.favorites) {
                const favorites = this.searchFavorites(query);
                matches.push(...favorites);
                logger.info('⭐ Found favorites:', favorites.length);
            }

            // 2. Search local database
            if (this.searchPreferences.localFoods && stateManager.getOnlineStatus() && !CONFIG.DEVELOPMENT_MODE) {
                try {
                    const localResults = await this.searchLocalDatabase(query);
                    matches.push(...localResults);
                    logger.info('🏠 Found local results:', localResults.length);
                } catch (error) {
                    logger.warn('Local database search failed:', error.message);
                }
            }

            // 3. Search enhanced sources (Open Food Facts, etc)
            if (this.searchPreferences.enhancedSearch && stateManager.getOnlineStatus() && !CONFIG.DEVELOPMENT_MODE) {
                try {
                    const enhancedResults = await this.searchEnhancedSources(query);
                    matches.push(...enhancedResults);
                    logger.info('🌐 Found enhanced results:', enhancedResults.length);
                } catch (error) {
                    logger.warn('Enhanced search failed:', error.message);
                }
            }

            // Remove duplicates and normalize
            const uniqueMatches = this.removeDuplicates(matches);
            logger.info('✅ Total unique results:', uniqueMatches.length);

            return uniqueMatches;

        } catch (error) {
            logger.error('Search error:', error);
            return [];
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Search favorites
     * @param {string} query - Search query
     * @returns {Array} Matching favorites
     */
    searchFavorites(query) {
        const favorites = this.getFavorites();
        const matches = favorites.filter(food => 
            food.name.toLowerCase().includes(query)
        );
        
        return matches.slice(0, 2).map(food => ({
            ...food,
            source: `⭐ ${food.source || 'Favorites'}`
        }));
    }

    /**
     * Search local database via API
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchLocalDatabase(query) {
        try {
            const response = await apiService.searchFoods(query);
            if (response.success && response.foods) {
                return response.foods.map(food => ({
                    id: food.id,
                    name: food.name,
                    calories: food.calories_per_unit || food.calories,
                    unit: 'g',
                    brand: food.brand || '',
                    source: 'Pios Food DB',
                    protein: food.protein_per_100g || 0,
                    carbs: food.carbs_per_100g || 0,
                    fat: food.fat_per_100g || 0,
                    fiber: food.fiber_per_100g || 0
                }));
            }
            return [];
        } catch (error) {
            logger.error('Local database search error:', error);
            return [];
        }
    }

    /**
     * Search enhanced sources (Open Food Facts, Nutritionix, etc.)
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchEnhancedSources(query) {
        // Check cache first
        const cacheKey = `enhanced_${query}`;
        const cached = stateManager.getFromEnhancedSearchCache(cacheKey);
        if (cached) {
            logger.debug('Using cached enhanced search results');
            return cached;
        }

        try {
            // Search Open Food Facts
            const offResults = await this.searchOpenFoodFacts(query);
            
            // Cache results
            if (offResults.length > 0) {
                stateManager.addToEnhancedSearchCache(cacheKey, offResults);
            }

            return offResults;
        } catch (error) {
            logger.error('Enhanced search error:', error);
            return [];
        }
    }

    /**
     * Search Open Food Facts API
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchOpenFoodFacts(query) {
        const cacheKey = `off_${query}`;
        const cached = stateManager.getFromOpenFoodFactsCache(cacheKey);
        if (cached) {
            logger.debug('Using cached OFF results');
            return cached;
        }

        try {
            const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=10`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`OFF API error: ${response.status}`);
            }

            const data = await response.json();
            const products = data.products || [];

            const results = products
                .filter(p => p.product_name && p.nutriments)
                .map(product => ({
                    name: product.product_name,
                    brand: product.brands || '',
                    calories: Math.round((product.nutriments['energy-kcal_100g'] || product.nutriments['energy-kcal']) || 0),
                    protein: Math.round(product.nutriments.proteins_100g || 0),
                    carbs: Math.round(product.nutriments.carbohydrates_100g || 0),
                    fat: Math.round(product.nutriments.fat_100g || 0),
                    fiber: Math.round(product.nutriments.fiber_100g || 0),
                    unit: 'g',
                    source: 'Open Food Facts',
                    barcode: product.code
                }));

            // Cache results
            stateManager.addToOpenFoodFactsCache(cacheKey, results);
            logger.info('OFF search completed:', results.length, 'products');

            return results;
        } catch (error) {
            logger.error('Open Food Facts search error:', error);
            return [];
        }
    }

    /**
     * Remove duplicate foods from results
     * @param {Array} foods - Array of food objects
     * @returns {Array} Unique foods
     */
    removeDuplicates(foods) {
        const uniqueFoods = [];
        const seenNames = new Set();

        for (const food of foods) {
            const normalizedName = food.name.toLowerCase().trim();
            if (!seenNames.has(normalizedName)) {
                seenNames.add(normalizedName);
                uniqueFoods.push(food);
            }
        }

        return uniqueFoods;
    }

    /**
     * Get favorites from localStorage
     * @returns {Array} Favorite foods
     */
    getFavorites() {
        try {
            const favorites = localStorage.getItem('favoriteFoods');
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            logger.error('Error loading favorites:', error);
            return [];
        }
    }

    /**
     * Add food to favorites
     * @param {Object} food - Food object
     */
    addToFavorites(food) {
        const favorites = this.getFavorites();
        
        // Check if already exists
        const exists = favorites.some(f => 
            f.name.toLowerCase() === food.name.toLowerCase()
        );

        if (!exists) {
            favorites.unshift({
                name: food.name,
                calories: food.calories,
                unit: food.unit || 'g',
                source: 'Favorites',
                addedAt: Date.now()
            });

            // Keep only last 20 favorites
            const trimmed = favorites.slice(0, 20);
            localStorage.setItem('favoriteFoods', JSON.stringify(trimmed));
            logger.info('Added to favorites:', food.name);
        }
    }

    /**
     * Get search preferences
     * @returns {Object} Search preferences
     */
    getSearchPreferences() {
        return { ...this.searchPreferences };
    }

    /**
     * Set search preference
     * @param {string} key - Preference key
     * @param {boolean} value - Preference value
     */
    setSearchPreference(key, value) {
        if (this.searchPreferences.hasOwnProperty(key)) {
            this.searchPreferences[key] = value;
            this.saveSearchPreferences();
            logger.info('Search preference updated:', key, '=', value);
        }
    }

    /**
     * Load search preferences from localStorage
     */
    loadSearchPreferences() {
        try {
            const saved = localStorage.getItem('searchPreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.searchPreferences = { ...this.searchPreferences, ...prefs };
                logger.info('Search preferences loaded');
            }
        } catch (error) {
            logger.error('Error loading search preferences:', error);
        }
    }

    /**
     * Save search preferences to localStorage
     */
    saveSearchPreferences() {
        try {
            localStorage.setItem('searchPreferences', JSON.stringify(this.searchPreferences));
            logger.debug('Search preferences saved');
        } catch (error) {
            logger.error('Error saving search preferences:', error);
        }
    }

    /**
     * Format nutrition text for display
     * @param {Object} food - Food object
     * @returns {string} Formatted nutrition text
     */
    formatNutritionText(food) {
        if (food.protein || food.carbs || food.fat) {
            const p = food.protein ? Math.round(food.protein) : 0;
            const c = food.carbs ? Math.round(food.carbs) : 0;
            const f = food.fat ? Math.round(food.fat) : 0;
            return `P:${p}g C:${c}g F:${f}g`;
        }
        return '';
    }

    /**
     * Get source icon for display
     * @param {string} source - Source name
     * @returns {string} Icon emoji
     */
    getSourceIcon(source) {
        if (source && source.includes('⭐')) return '⭐';
        if (source === 'Pios Food DB') return '🏠';
        if (source === 'Open Food Facts') return '🌍';
        if (source === 'Local Database') return '🏪';
        return '💾';
    }

    /**
     * Get source tooltip text
     * @param {string} source - Source name
     * @returns {string} Tooltip text
     */
    getSourceTooltip(source) {
        const tooltips = {
            'Pios Food DB': 'Curated database with accurate nutrition data',
            'Open Food Facts': 'Community-driven global product database',
            'Favorites': 'Your frequently used foods',
            'Local Database': 'Offline local storage'
        };
        return tooltips[source] || source;
    }

    /**
     * Highlight matching text in search results
     * @param {string} text - Text to highlight
     * @param {string} query - Search query
     * @returns {string} HTML with highlighted text
     */
    highlightMatch(text, query) {
        if (!query || !text) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Clear all search caches
     */
    clearCaches() {
        stateManager.clearAllCaches();
        logger.info('Search caches cleared');
    }
}

// Export singleton instance
export const foodSearchService = new FoodSearchService();
