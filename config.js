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
    
    // Food suggestions limit
    MAX_SUGGESTIONS: 5,
    MIN_SEARCH_LENGTH: 2,
    
    // Session settings
    TOKEN_STORAGE_KEY: 'calorieTrackerToken',
    USER_STORAGE_KEY: 'calorieTrackerUser',
    
    // Development mode
    DEVELOPMENT_MODE: false, // Set to true for offline testing
    
    // Offline mode settings (when backend is not available)
    ENABLE_OFFLINE_MODE: true,
    OFFLINE_STORAGE_KEY: 'calorieTrackerOffline'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}