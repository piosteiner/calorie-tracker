// Configuration for the Calorie Tracker app
const CONFIG = {
    // API Configuration
    API_BASE_URL: 'https://api.calorie-tracker.piogino.ch/api', // Production API URL
    
    // Local development (uncomment for local testing)
    // API_BASE_URL: 'http://localhost:3000/api',
    
    // App Settings
    DEFAULT_CALORIE_GOAL: 2000,
    MAX_DAILY_CALORIES: 5000,
    MIN_DAILY_CALORIES: 1000,
    
    // UI Settings
    ITEMS_PER_PAGE: 20,
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    
    // Food suggestions settings
    MAX_SUGGESTIONS: 10,
    MIN_SEARCH_LENGTH: 2,
    
    // Timing constants (in milliseconds)
    TIMING: {
        NUTRITION_PREVIEW_DURATION: 5000,        // 5 seconds
        SYNC_INTERVAL: 30000,                    // 30 seconds
        DEBOUNCE_DELAY: 300,                     // 300ms for search
        CACHE_EXPIRY: 24 * 60 * 60 * 1000,      // 24 hours
    },
    
    // Validation limits
    LIMITS: {
        MAX_FOOD_NAME_LENGTH: 100,
        MAX_USERNAME_LENGTH: 50,
        MIN_USERNAME_LENGTH: 3,
        MAX_QUANTITY: 10000,
        MAX_CALORIES_PER_100G: 10000,
        MIN_PASSWORD_LENGTH: 6,
        MAX_PASSWORD_LENGTH: 128,
    },
    
    // Session settings
    TOKEN_STORAGE_KEY: 'calorieTrackerToken',
    USER_STORAGE_KEY: 'calorieTrackerUser',
    
    // Debug logging (set to false in production for performance)
    ENABLE_DEBUG_LOGGING: true, // Set to true to see detailed logs in console
    
    // Offline mode settings (when backend is not available)
    ENABLE_OFFLINE_MODE: true,
    OFFLINE_STORAGE_KEY: 'calorieTrackerOffline'
};

// Make available as global variable
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

// CommonJS export (for Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Note: To use as ES6 module, load this file with type="module" and uncomment below:
// export default CONFIG;
// export { CONFIG };