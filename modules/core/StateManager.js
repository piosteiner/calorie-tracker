/**
 * StateManager.js
 * Centralized state management with observer pattern
 * Manages all application state and notifies subscribers of changes
 */

import { logger } from '../../logger.js';
import { CONFIG } from '../../config.js';

export class StateManager {
    constructor() {
        // User state
        this.currentUser = null;
        this.isAdmin = false;
        this.calorieGoal = CONFIG.DEFAULT_CALORIE_GOAL;
        
        // Food log state
        this.foodLog = [];
        this.dailyCalories = 0;
        
        // Admin state
        this.adminData = {
            users: [],
            foods: [],
            stats: {},
            foodsSortColumn: 'name',
            foodsSortDirection: 'asc',
            selectedFoodIds: new Set()
        };
        
        // Sync state
        this.syncQueue = [];
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.syncStatus = 'pending'; // 'pending', 'syncing', 'synced', 'error'
        
        // Network state
        this.isOnline = navigator.onLine;
        
        // Cache state
        this.openFoodFactsCache = new Map();
        this.enhancedSearchCache = new Map();
        
        // Observer pattern - subscribers for state changes
        this.subscribers = {
            user: [],
            foodLog: [],
            dailyCalories: [],
            adminData: [],
            sync: [],
            network: []
        };
    }

    // ============================================
    // OBSERVER PATTERN - SUBSCRIPTION METHODS
    // ============================================

    /**
     * Subscribe to state changes
     * @param {string} stateKey - State property to watch
     * @param {Function} callback - Function to call on state change
     * @returns {Function} Unsubscribe function
     */
    subscribe(stateKey, callback) {
        if (!this.subscribers[stateKey]) {
            logger.warn(`Unknown state key: ${stateKey}`);
            return () => {};
        }
        
        this.subscribers[stateKey].push(callback);
        logger.debug(`Subscribed to ${stateKey} state changes`);
        
        // Return unsubscribe function
        return () => {
            const index = this.subscribers[stateKey].indexOf(callback);
            if (index > -1) {
                this.subscribers[stateKey].splice(index, 1);
                logger.debug(`Unsubscribed from ${stateKey} state changes`);
            }
        };
    }

    /**
     * Notify subscribers of state change
     * @param {string} stateKey - State property that changed
     * @param {*} newValue - New value
     */
    notify(stateKey, newValue) {
        if (this.subscribers[stateKey]) {
            this.subscribers[stateKey].forEach(callback => {
                try {
                    callback(newValue);
                } catch (error) {
                    logger.error(`Error in ${stateKey} subscriber:`, error);
                }
            });
        }
    }

    // ============================================
    // USER STATE METHODS
    // ============================================

    /**
     * Set current user
     * @param {Object} user - User object
     */
    setCurrentUser(user) {
        this.currentUser = user;
        this.isAdmin = user?.is_admin || false;
        this.calorieGoal = user?.calorie_goal || CONFIG.DEFAULT_CALORIE_GOAL;
        
        logger.info('Current user set:', user?.username, '| Admin:', this.isAdmin);
        this.notify('user', user);
    }

    /**
     * Get current user
     * @returns {Object|null} Current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Clear user (logout)
     */
    clearUser() {
        this.currentUser = null;
        this.isAdmin = false;
        this.calorieGoal = CONFIG.DEFAULT_CALORIE_GOAL;
        
        logger.info('User cleared (logged out)');
        this.notify('user', null);
    }

    /**
     * Check if user is admin
     * @returns {boolean}
     */
    isUserAdmin() {
        return this.isAdmin;
    }

    /**
     * Update calorie goal
     * @param {number} goal - New calorie goal
     */
    setCalorieGoal(goal) {
        this.calorieGoal = goal;
        if (this.currentUser) {
            this.currentUser.calorie_goal = goal;
        }
        logger.info('Calorie goal updated:', goal);
        this.notify('user', this.currentUser);
    }

    // ============================================
    // FOOD LOG STATE METHODS
    // ============================================

    /**
     * Set food log
     * @param {Array} log - Food log entries
     */
    setFoodLog(log) {
        this.foodLog = log;
        this.updateDailyCalories();
        logger.info('Food log set with', log.length, 'entries');
        this.notify('foodLog', log);
    }

    /**
     * Get food log
     * @returns {Array} Food log entries
     */
    getFoodLog() {
        return this.foodLog;
    }

    /**
     * Add food to log
     * @param {Object} foodEntry - Food entry to add
     */
    addFoodToLog(foodEntry) {
        this.foodLog.unshift(foodEntry); // Add to beginning
        this.updateDailyCalories();
        logger.info('Food added to log:', foodEntry.name);
        this.notify('foodLog', this.foodLog);
    }

    /**
     * Remove food from log
     * @param {number} foodId - Food ID to remove
     * @returns {boolean} Success status
     */
    removeFoodFromLog(foodId) {
        const index = this.foodLog.findIndex(food => food.id === foodId);
        if (index === -1) {
            logger.warn('Food not found in log:', foodId);
            return false;
        }
        
        const removed = this.foodLog.splice(index, 1)[0];
        this.updateDailyCalories();
        logger.info('Food removed from log:', removed.name);
        this.notify('foodLog', this.foodLog);
        return true;
    }

    /**
     * Clear food log
     */
    clearFoodLog() {
        this.foodLog = [];
        this.dailyCalories = 0;
        logger.info('Food log cleared');
        this.notify('foodLog', []);
        this.notify('dailyCalories', 0);
    }

    /**
     * Calculate and update daily calories
     */
    updateDailyCalories() {
        this.dailyCalories = this.foodLog.reduce((sum, food) => sum + (food.calories || 0), 0);
        logger.debug('Daily calories updated:', this.dailyCalories);
        this.notify('dailyCalories', this.dailyCalories);
    }

    /**
     * Get daily calories
     * @returns {number} Total daily calories
     */
    getDailyCalories() {
        return this.dailyCalories;
    }

    // ============================================
    // ADMIN STATE METHODS
    // ============================================

    /**
     * Set admin users
     * @param {Array} users - Users list
     */
    setAdminUsers(users) {
        this.adminData.users = users;
        logger.info('Admin users set:', users.length, 'users');
        this.notify('adminData', this.adminData);
    }

    /**
     * Set admin foods
     * @param {Array} foods - Foods list
     */
    setAdminFoods(foods) {
        this.adminData.foods = foods;
        logger.info('Admin foods set:', foods.length, 'foods');
        this.notify('adminData', this.adminData);
    }

    /**
     * Set admin stats
     * @param {Object} stats - Statistics object
     */
    setAdminStats(stats) {
        this.adminData.stats = stats;
        logger.info('Admin stats set');
        this.notify('adminData', this.adminData);
    }

    /**
     * Set food sort column and direction
     * @param {string} column - Column name
     * @param {string} direction - 'asc' or 'desc'
     */
    setFoodSort(column, direction = null) {
        if (this.adminData.foodsSortColumn === column && !direction) {
            // Toggle direction if same column
            this.adminData.foodsSortDirection = 
                this.adminData.foodsSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.adminData.foodsSortColumn = column;
            this.adminData.foodsSortDirection = direction || 'asc';
        }
        logger.debug('Food sort set:', column, this.adminData.foodsSortDirection);
        this.notify('adminData', this.adminData);
    }

    /**
     * Toggle food selection for bulk operations
     * @param {number} foodId - Food ID
     */
    toggleFoodSelection(foodId) {
        if (this.adminData.selectedFoodIds.has(foodId)) {
            this.adminData.selectedFoodIds.delete(foodId);
        } else {
            this.adminData.selectedFoodIds.add(foodId);
        }
        logger.debug('Food selection toggled:', foodId, 
            'Selected:', this.adminData.selectedFoodIds.size);
        this.notify('adminData', this.adminData);
    }

    /**
     * Select all foods
     */
    selectAllFoods() {
        this.adminData.selectedFoodIds.clear();
        this.adminData.foods.forEach(food => {
            this.adminData.selectedFoodIds.add(food.id);
        });
        logger.info('All foods selected:', this.adminData.selectedFoodIds.size);
        this.notify('adminData', this.adminData);
    }

    /**
     * Deselect all foods
     */
    deselectAllFoods() {
        this.adminData.selectedFoodIds.clear();
        logger.info('All foods deselected');
        this.notify('adminData', this.adminData);
    }

    /**
     * Get selected food IDs
     * @returns {Set} Selected food IDs
     */
    getSelectedFoodIds() {
        return this.adminData.selectedFoodIds;
    }

    // ============================================
    // SYNC STATE METHODS
    // ============================================

    /**
     * Add operation to sync queue
     * @param {Object} operation - Operation to sync
     */
    addToSyncQueue(operation) {
        this.syncQueue.push(operation);
        logger.debug('Added to sync queue:', operation.type);
        this.notify('sync', { queue: this.syncQueue, status: this.syncStatus });
    }

    /**
     * Clear sync queue
     */
    clearSyncQueue() {
        this.syncQueue = [];
        logger.info('Sync queue cleared');
        this.notify('sync', { queue: [], status: this.syncStatus });
    }

    /**
     * Set sync status
     * @param {string} status - 'pending', 'syncing', 'synced', 'error'
     */
    setSyncStatus(status) {
        this.syncStatus = status;
        this.lastSyncTime = status === 'synced' ? Date.now() : this.lastSyncTime;
        logger.info('Sync status:', status);
        this.notify('sync', { queue: this.syncQueue, status });
    }

    /**
     * Set sync in progress flag
     * @param {boolean} inProgress
     */
    setSyncInProgress(inProgress) {
        this.syncInProgress = inProgress;
        logger.debug('Sync in progress:', inProgress);
    }

    // ============================================
    // NETWORK STATE METHODS
    // ============================================

    /**
     * Set online status
     * @param {boolean} online
     */
    setOnlineStatus(online) {
        this.isOnline = online;
        logger.info('Network status:', online ? 'Online' : 'Offline');
        this.notify('network', online);
    }

    /**
     * Get online status
     * @returns {boolean}
     */
    getOnlineStatus() {
        return this.isOnline;
    }

    // ============================================
    // CACHE METHODS
    // ============================================

    /**
     * Add to OpenFoodFacts cache
     * @param {string} key - Cache key
     * @param {Array} results - Search results
     */
    addToOpenFoodFactsCache(key, results) {
        this.openFoodFactsCache.set(key, results);
        logger.debug('Added to OpenFoodFacts cache:', key);
    }

    /**
     * Get from OpenFoodFacts cache
     * @param {string} key - Cache key
     * @returns {Array|null} Cached results
     */
    getFromOpenFoodFactsCache(key) {
        return this.openFoodFactsCache.get(key) || null;
    }

    /**
     * Add to enhanced search cache
     * @param {string} key - Cache key
     * @param {Array} results - Search results
     */
    addToEnhancedSearchCache(key, results) {
        this.enhancedSearchCache.set(key, {
            results,
            timestamp: Date.now()
        });
        logger.debug('Added to enhanced search cache:', key);
    }

    /**
     * Get from enhanced search cache
     * @param {string} key - Cache key
     * @returns {Array|null} Cached results if not expired
     */
    getFromEnhancedSearchCache(key) {
        const cached = this.enhancedSearchCache.get(key);
        if (!cached) return null;
        
        // Check if cache expired (24 hours)
        if (Date.now() - cached.timestamp > CONFIG.LIMITS.CACHE_EXPIRY) {
            this.enhancedSearchCache.delete(key);
            logger.debug('Enhanced search cache expired:', key);
            return null;
        }
        
        return cached.results;
    }

    /**
     * Load cached searches from localStorage
     */
    loadCachedSearches() {
        try {
            const cached = localStorage.getItem('foodSearchCache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                // Only load cache if it's less than 24 hours old
                if (Date.now() - cacheData.timestamp < CONFIG.LIMITS.CACHE_EXPIRY) {
                    cacheData.searches.forEach(search => {
                        this.openFoodFactsCache.set(search.key, search.results);
                    });
                    logger.info(`Loaded ${cacheData.searches.length} cached food searches`);
                }
            }
        } catch (error) {
            logger.error('Error loading cached searches:', error);
        }
    }

    /**
     * Save cache to localStorage
     */
    saveCacheToStorage() {
        try {
            const cacheData = {
                timestamp: Date.now(),
                searches: Array.from(this.openFoodFactsCache.entries()).map(([key, results]) => ({
                    key,
                    results
                }))
            };
            localStorage.setItem('foodSearchCache', JSON.stringify(cacheData));
            logger.debug('Cache saved to localStorage');
        } catch (error) {
            logger.error('Error saving cache:', error);
        }
    }

    /**
     * Clear all caches
     */
    clearAllCaches() {
        this.openFoodFactsCache.clear();
        this.enhancedSearchCache.clear();
        localStorage.removeItem('foodSearchCache');
        logger.info('All caches cleared');
    }

    // ============================================
    // STATE PERSISTENCE
    // ============================================

    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            const state = {
                currentUser: this.currentUser,
                calorieGoal: this.calorieGoal,
                foodLog: this.foodLog,
                syncQueue: this.syncQueue,
                lastSyncTime: this.lastSyncTime
            };
            localStorage.setItem('appState', JSON.stringify(state));
            logger.debug('App state saved to localStorage');
        } catch (error) {
            logger.error('Error saving app state:', error);
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('appState');
            if (saved) {
                const state = JSON.parse(saved);
                this.currentUser = state.currentUser;
                this.calorieGoal = state.calorieGoal || CONFIG.DEFAULT_CALORIE_GOAL;
                this.foodLog = state.foodLog || [];
                this.syncQueue = state.syncQueue || [];
                this.lastSyncTime = state.lastSyncTime;
                this.updateDailyCalories();
                logger.info('App state loaded from localStorage');
                return true;
            }
        } catch (error) {
            logger.error('Error loading app state:', error);
        }
        return false;
    }

    /**
     * Clear saved state
     */
    clearState() {
        localStorage.removeItem('appState');
        logger.info('App state cleared from localStorage');
    }
}

// Export singleton instance
export const stateManager = new StateManager();
