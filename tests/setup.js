/**
 * Test Setup
 * Global setup and mocks for all tests
 */

import 'jest-localstorage-mock';

// Mock logger for tests
global.logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    emoji: jest.fn(),
    group: jest.fn(),
    groupEnd: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    table: jest.fn(),
};

// Mock CONFIG
global.CONFIG = {
    DEVELOPMENT_MODE: false,
    API_BASE_URL: 'http://localhost:3000',
    DEFAULT_CALORIE_GOAL: 2000,
    MAX_SUGGESTIONS: 10,
    TIMING: {
        NUTRITION_PREVIEW_DURATION: 5000,
        SYNC_INTERVAL: 30000,
        DEBOUNCE_DELAY: 300,
        CACHE_EXPIRY: 86400000
    },
    LIMITS: {
        MAX_FOOD_NAME_LENGTH: 100,
        MAX_USERNAME_LENGTH: 50,
        MIN_USERNAME_LENGTH: 3,
        MAX_QUANTITY: 10000,
        MAX_CALORIES_PER_100G: 10000,
        MIN_PASSWORD_LENGTH: 6,
        MAX_PASSWORD_LENGTH: 128,
        CACHE_EXPIRY: 86400000
    }
};

// Mock fetch globally
global.fetch = jest.fn();

// Setup DOM mocks
beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset fetch mock
    global.fetch.mockReset();
    
    // Create basic DOM structure
    document.body.innerHTML = `
        <div id="foodLog"></div>
        <div id="foodSuggestions"></div>
        <div id="dailyCalories">0</div>
        <div id="calorieGoal">2000</div>
        <div id="calorieProgress"></div>
        <div class="active">
            <div class="container"></div>
        </div>
    `;
});

afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
});
