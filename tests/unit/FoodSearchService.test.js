/**
 * FoodSearchService Unit Tests
 * Tests for food search logic, caching, and debouncing
 */

import { FoodSearchService } from '../../modules/core/FoodSearchService.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

// Mock apiService
const mockApiService = {
    searchFoods: jest.fn()
};

// Mock stateManager
const mockStateManager = {
    getOnlineStatus: jest.fn(() => true),
    getFromOpenFoodFactsCache: jest.fn(),
    addToOpenFoodFactsCache: jest.fn(),
    getFromEnhancedSearchCache: jest.fn(),
    addToEnhancedSearchCache: jest.fn(),
    loadCachedSearches: jest.fn(),
    clearAllCaches: jest.fn()
};

jest.mock('../../modules/api/ApiService.js', () => ({
    apiService: mockApiService
}));

jest.mock('../../modules/core/StateManager.js', () => ({
    stateManager: mockStateManager
}));

describe('FoodSearchService', () => {
    let foodSearchService;

    beforeEach(() => {
        foodSearchService = new FoodSearchService();
        jest.clearAllMocks();
        localStorage.clear();
        global.fetch.mockReset();
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('Initialization', () => {
        test('should initialize with default properties', () => {
            expect(foodSearchService.isSearching).toBe(false);
            expect(foodSearchService.debounceTimeout).toBeNull();
            expect(foodSearchService.selectedSuggestionIndex).toBe(-1);
            expect(foodSearchService.openFoodFactsCache).toBeInstanceOf(Map);
        });

        test('should initialize with default search preferences', () => {
            const prefs = foodSearchService.getSearchPreferences();
            expect(prefs.favorites).toBe(true);
            expect(prefs.localFoods).toBe(true);
            expect(prefs.enhancedSearch).toBe(false);
        });

        test('should load preferences from localStorage on init', () => {
            const savedPrefs = {
                favorites: false,
                localFoods: true,
                enhancedSearch: true
            };
            localStorage.setItem('searchPreferences', JSON.stringify(savedPrefs));

            foodSearchService.init();

            const prefs = foodSearchService.getSearchPreferences();
            expect(prefs.favorites).toBe(false);
            expect(prefs.enhancedSearch).toBe(true);
        });
    });

    // ============================================
    // DEBOUNCED SEARCH TESTS
    // ============================================
    describe('Debounced Search', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should debounce search calls', () => {
            const callback = jest.fn();
            const searchSpy = jest.spyOn(foodSearchService, 'searchFoods').mockResolvedValue([]);

            foodSearchService.debouncedSearch('apple', callback, 300);
            foodSearchService.debouncedSearch('apple', callback, 300);
            foodSearchService.debouncedSearch('apple', callback, 300);

            expect(searchSpy).not.toHaveBeenCalled();

            jest.advanceTimersByTime(300);

            expect(searchSpy).toHaveBeenCalledTimes(1);
            expect(searchSpy).toHaveBeenCalledWith('apple');
        });

        test('should cancel previous debounced searches', () => {
            const callback = jest.fn();
            jest.spyOn(foodSearchService, 'searchFoods').mockResolvedValue([]);

            foodSearchService.debouncedSearch('app', callback, 300);
            jest.advanceTimersByTime(100);
            
            foodSearchService.debouncedSearch('apple', callback, 300);
            jest.advanceTimersByTime(300);

            expect(foodSearchService.searchFoods).toHaveBeenCalledTimes(1);
            expect(foodSearchService.searchFoods).toHaveBeenCalledWith('apple');
        });
    });

    // ============================================
    // SEARCH FOODS TESTS
    // ============================================
    describe('Search Foods', () => {
        test('should skip search for queries shorter than 2 characters', async () => {
            const results = await foodSearchService.searchFoods('a');
            expect(results).toEqual([]);
        });

        test('should skip search for empty query', async () => {
            const results = await foodSearchService.searchFoods('');
            expect(results).toEqual([]);
        });

        test('should prevent concurrent searches', async () => {
            foodSearchService.isSearching = true;
            const results = await foodSearchService.searchFoods('apple');
            
            expect(results).toEqual([]);
        });

        test('should search favorites when enabled', async () => {
            const favorites = [
                { name: 'Apple Pie', calories: 300, source: 'Favorites' }
            ];
            localStorage.setItem('favoriteFoods', JSON.stringify(favorites));
            foodSearchService.searchPreferences.favorites = true;
            foodSearchService.searchPreferences.localFoods = false;

            const results = await foodSearchService.searchFoods('apple');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Apple Pie');
            expect(results[0].source).toContain('⭐');
        });

        test('should search local database when enabled', async () => {
            const localResults = [
                { id: 1, name: 'Apple', calories: 95 }
            ];
            mockApiService.searchFoods.mockResolvedValue({
                success: true,
                foods: localResults
            });
            foodSearchService.searchPreferences.favorites = false;
            foodSearchService.searchPreferences.localFoods = true;

            const results = await foodSearchService.searchFoods('apple');

            expect(mockApiService.searchFoods).toHaveBeenCalledWith('apple');
            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('Pios Food DB');
        });

        test('should handle local database search errors gracefully', async () => {
            mockApiService.searchFoods.mockRejectedValue(new Error('API Error'));
            foodSearchService.searchPreferences.localFoods = true;

            const results = await foodSearchService.searchFoods('apple');

            expect(results).toEqual([]);
        });

        test('should search enhanced sources when enabled', async () => {
            mockStateManager.getFromEnhancedSearchCache.mockReturnValue(null);
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    products: [
                        {
                            product_name: 'Red Apple',
                            brands: 'Fresh',
                            nutriments: {
                                'energy-kcal_100g': 52,
                                proteins_100g: 0.3,
                                carbohydrates_100g: 14,
                                fat_100g: 0.2
                            },
                            code: '123456'
                        }
                    ]
                })
            });

            foodSearchService.searchPreferences.favorites = false;
            foodSearchService.searchPreferences.localFoods = false;
            foodSearchService.searchPreferences.enhancedSearch = true;

            const results = await foodSearchService.searchFoods('apple');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Red Apple');
            expect(results[0].source).toBe('Open Food Facts');
        });

        test('should remove duplicate results', async () => {
            const favorites = [
                { name: 'apple', calories: 95 }
            ];
            localStorage.setItem('favoriteFoods', JSON.stringify(favorites));
            
            mockApiService.searchFoods.mockResolvedValue({
                success: true,
                foods: [
                    { id: 1, name: 'Apple', calories: 95 } // Duplicate (case-insensitive)
                ]
            });

            foodSearchService.searchPreferences.favorites = true;
            foodSearchService.searchPreferences.localFoods = true;

            const results = await foodSearchService.searchFoods('apple');

            // Should only have one 'apple' (duplicates removed)
            expect(results).toHaveLength(1);
        });
    });

    // ============================================
    // FAVORITES TESTS
    // ============================================
    describe('Favorites Management', () => {
        test('should get favorites from localStorage', () => {
            const favorites = [
                { name: 'Apple', calories: 95 },
                { name: 'Banana', calories: 105 }
            ];
            localStorage.setItem('favoriteFoods', JSON.stringify(favorites));

            const result = foodSearchService.getFavorites();

            expect(result).toEqual(favorites);
        });

        test('should return empty array if no favorites', () => {
            const result = foodSearchService.getFavorites();
            expect(result).toEqual([]);
        });

        test('should handle corrupted favorites data', () => {
            localStorage.setItem('favoriteFoods', 'invalid json');

            const result = foodSearchService.getFavorites();

            expect(result).toEqual([]);
        });

        test('should add food to favorites', () => {
            const food = { name: 'Apple', calories: 95, unit: 'g' };

            foodSearchService.addToFavorites(food);

            const favorites = JSON.parse(localStorage.getItem('favoriteFoods'));
            expect(favorites).toHaveLength(1);
            expect(favorites[0].name).toBe('Apple');
            expect(favorites[0].source).toBe('Favorites');
        });

        test('should not add duplicate to favorites', () => {
            const food = { name: 'Apple', calories: 95 };

            foodSearchService.addToFavorites(food);
            foodSearchService.addToFavorites(food);

            const favorites = JSON.parse(localStorage.getItem('favoriteFoods'));
            expect(favorites).toHaveLength(1);
        });

        test('should keep only last 20 favorites', () => {
            // Add 25 favorites
            for (let i = 1; i <= 25; i++) {
                foodSearchService.addToFavorites({
                    name: `Food ${i}`,
                    calories: 100
                });
            }

            const favorites = JSON.parse(localStorage.getItem('favoriteFoods'));
            expect(favorites).toHaveLength(20);
            expect(favorites[0].name).toBe('Food 25'); // Most recent first
        });

        test('should search favorites case-insensitively', () => {
            localStorage.setItem('favoriteFoods', JSON.stringify([
                { name: 'Apple Pie', calories: 300 },
                { name: 'Banana Bread', calories: 200 }
            ]));

            const results = foodSearchService.searchFavorites('APPLE');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Apple Pie');
        });
    });

    // ============================================
    // OPEN FOOD FACTS TESTS
    // ============================================
    describe('Open Food Facts Search', () => {
        test('should use cached results if available', async () => {
            const cachedResults = [{ name: 'Apple', calories: 52 }];
            mockStateManager.getFromOpenFoodFactsCache.mockReturnValue(cachedResults);

            const results = await foodSearchService.searchOpenFoodFacts('apple');

            expect(results).toEqual(cachedResults);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should fetch from API if not cached', async () => {
            mockStateManager.getFromOpenFoodFactsCache.mockReturnValue(null);
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    products: [
                        {
                            product_name: 'Apple',
                            brands: 'Fresh',
                            nutriments: {
                                'energy-kcal_100g': 52,
                                proteins_100g: 0.3,
                                carbohydrates_100g: 14,
                                fat_100g: 0.2,
                                fiber_100g: 2.4
                            },
                            code: '123'
                        }
                    ]
                })
            });

            const results = await foodSearchService.searchOpenFoodFacts('apple');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Apple');
            expect(results[0].calories).toBe(52);
            expect(results[0].protein).toBe(0);
            expect(mockStateManager.addToOpenFoodFactsCache).toHaveBeenCalled();
        });

        test('should filter products without name or nutriments', async () => {
            mockStateManager.getFromOpenFoodFactsCache.mockReturnValue(null);
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    products: [
                        {
                            product_name: 'Valid Product',
                            nutriments: { 'energy-kcal_100g': 100 }
                        },
                        {
                            product_name: 'No Nutriments'
                        },
                        {
                            nutriments: { 'energy-kcal_100g': 100 }
                        }
                    ]
                })
            });

            const results = await foodSearchService.searchOpenFoodFacts('test');

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Valid Product');
        });

        test('should handle API errors gracefully', async () => {
            mockStateManager.getFromOpenFoodFactsCache.mockReturnValue(null);
            global.fetch.mockRejectedValue(new Error('Network error'));

            const results = await foodSearchService.searchOpenFoodFacts('apple');

            expect(results).toEqual([]);
        });

        test('should handle non-OK response', async () => {
            mockStateManager.getFromOpenFoodFactsCache.mockReturnValue(null);
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500
            });

            const results = await foodSearchService.searchOpenFoodFacts('apple');

            expect(results).toEqual([]);
        });
    });

    // ============================================
    // SEARCH PREFERENCES TESTS
    // ============================================
    describe('Search Preferences', () => {
        test('should get search preferences', () => {
            const prefs = foodSearchService.getSearchPreferences();

            expect(prefs).toHaveProperty('favorites');
            expect(prefs).toHaveProperty('localFoods');
            expect(prefs).toHaveProperty('enhancedSearch');
        });

        test('should set search preference', () => {
            foodSearchService.setSearchPreference('enhancedSearch', true);

            expect(foodSearchService.searchPreferences.enhancedSearch).toBe(true);
        });

        test('should save preferences to localStorage when set', () => {
            foodSearchService.setSearchPreference('favorites', false);

            const saved = JSON.parse(localStorage.getItem('searchPreferences'));
            expect(saved.favorites).toBe(false);
        });

        test('should not set invalid preference keys', () => {
            const originalPrefs = { ...foodSearchService.searchPreferences };

            foodSearchService.setSearchPreference('invalidKey', true);

            expect(foodSearchService.searchPreferences).toEqual(originalPrefs);
        });

        test('should load preferences from localStorage', () => {
            const prefs = {
                favorites: false,
                localFoods: false,
                enhancedSearch: true
            };
            localStorage.setItem('searchPreferences', JSON.stringify(prefs));

            foodSearchService.loadSearchPreferences();

            expect(foodSearchService.searchPreferences).toMatchObject(prefs);
        });

        test('should handle corrupted preferences gracefully', () => {
            localStorage.setItem('searchPreferences', 'invalid json');

            foodSearchService.loadSearchPreferences();

            // Should keep default preferences
            expect(foodSearchService.searchPreferences.favorites).toBe(true);
        });
    });

    // ============================================
    // HELPER METHODS TESTS
    // ============================================
    describe('Helper Methods', () => {
        test('should format nutrition text correctly', () => {
            const food = { protein: 5.5, carbs: 12.3, fat: 0.8 };

            const result = foodSearchService.formatNutritionText(food);

            expect(result).toBe('P:6g C:12g F:1g');
        });

        test('should return empty string for no nutrition data', () => {
            const food = { calories: 100 };

            const result = foodSearchService.formatNutritionText(food);

            expect(result).toBe('');
        });

        test('should get correct source icon', () => {
            expect(foodSearchService.getSourceIcon('⭐ Favorites')).toBe('⭐');
            expect(foodSearchService.getSourceIcon('Pios Food DB')).toBe('🏠');
            expect(foodSearchService.getSourceIcon('Open Food Facts')).toBe('🌍');
            expect(foodSearchService.getSourceIcon('Local Database')).toBe('🏪');
            expect(foodSearchService.getSourceIcon('Unknown')).toBe('💾');
        });

        test('should get source tooltip', () => {
            const tooltip = foodSearchService.getSourceTooltip('Pios Food DB');
            expect(tooltip).toContain('Curated database');
        });

        test('should highlight matching text', () => {
            const result = foodSearchService.highlightMatch('Apple Pie', 'apple');

            expect(result).toContain('<mark>');
            expect(result).toContain('Apple');
        });

        test('should handle null values in highlight', () => {
            expect(foodSearchService.highlightMatch(null, 'test')).toBe(null);
            expect(foodSearchService.highlightMatch('test', null)).toBe('test');
        });
    });

    // ============================================
    // REMOVE DUPLICATES TESTS
    // ============================================
    describe('Remove Duplicates', () => {
        test('should remove duplicate foods by name', () => {
            const foods = [
                { name: 'Apple', calories: 95 },
                { name: 'apple', calories: 100 },
                { name: 'APPLE', calories: 90 },
                { name: 'Banana', calories: 105 }
            ];

            const unique = foodSearchService.removeDuplicates(foods);

            expect(unique).toHaveLength(2);
            expect(unique[0].name).toBe('Apple');
            expect(unique[1].name).toBe('Banana');
        });

        test('should keep first occurrence of duplicate', () => {
            const foods = [
                { name: 'Apple', calories: 95, source: 'Favorites' },
                { name: 'apple', calories: 100, source: 'Local' }
            ];

            const unique = foodSearchService.removeDuplicates(foods);

            expect(unique).toHaveLength(1);
            expect(unique[0].source).toBe('Favorites');
        });

        test('should handle empty array', () => {
            const unique = foodSearchService.removeDuplicates([]);
            expect(unique).toEqual([]);
        });
    });

    // ============================================
    // CACHE CLEARING TESTS
    // ============================================
    describe('Cache Clearing', () => {
        test('should clear all caches', () => {
            foodSearchService.clearCaches();

            expect(mockStateManager.clearAllCaches).toHaveBeenCalled();
        });
    });
});
