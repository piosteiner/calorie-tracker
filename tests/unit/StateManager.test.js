/**
 * StateManager Unit Tests
 * Tests for centralized state management with observer pattern
 */

import { StateManager } from '../../modules/core/StateManager.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        stateManager = new StateManager();
        localStorage.clear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('Initialization', () => {
        test('should initialize with default state', () => {
            expect(stateManager.currentUser).toBeNull();
            expect(stateManager.isAdmin).toBe(false);
            expect(stateManager.foodLog).toEqual([]);
            expect(stateManager.dailyCalories).toBe(0);
            expect(stateManager.calorieGoal).toBe(2000);
            expect(stateManager.isOnline).toBe(true);
        });

        test('should initialize admin data correctly', () => {
            expect(stateManager.adminData.users).toEqual([]);
            expect(stateManager.adminData.foods).toEqual([]);
            expect(stateManager.adminData.stats).toEqual({});
            expect(stateManager.adminData.foodsSortColumn).toBe('name');
            expect(stateManager.adminData.foodsSortDirection).toBe('asc');
            expect(stateManager.adminData.selectedFoodIds).toBeInstanceOf(Set);
        });

        test('should initialize cache maps', () => {
            expect(stateManager.openFoodFactsCache).toBeInstanceOf(Map);
            expect(stateManager.enhancedSearchCache).toBeInstanceOf(Map);
        });
    });

    // ============================================
    // OBSERVER PATTERN TESTS
    // ============================================
    describe('Observer Pattern', () => {
        test('should subscribe to state changes', () => {
            const callback = jest.fn();
            const unsubscribe = stateManager.subscribe('user', callback);

            expect(typeof unsubscribe).toBe('function');
            expect(stateManager.subscribers.user).toContain(callback);
        });

        test('should unsubscribe from state changes', () => {
            const callback = jest.fn();
            const unsubscribe = stateManager.subscribe('user', callback);

            unsubscribe();

            expect(stateManager.subscribers.user).not.toContain(callback);
        });

        test('should notify subscribers on state change', () => {
            const callback = jest.fn();
            stateManager.subscribe('user', callback);

            const newUser = { id: 1, username: 'testuser' };
            stateManager.notify('user', newUser);

            expect(callback).toHaveBeenCalledWith(newUser);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should notify multiple subscribers', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            stateManager.subscribe('user', callback1);
            stateManager.subscribe('user', callback2);

            const newUser = { id: 1, username: 'testuser' };
            stateManager.notify('user', newUser);

            expect(callback1).toHaveBeenCalledWith(newUser);
            expect(callback2).toHaveBeenCalledWith(newUser);
        });

        test('should handle errors in subscriber callbacks', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Subscriber error');
            });
            const normalCallback = jest.fn();

            stateManager.subscribe('user', errorCallback);
            stateManager.subscribe('user', normalCallback);

            const newUser = { id: 1, username: 'testuser' };
            stateManager.notify('user', newUser);

            // Normal callback should still be called despite error in first
            expect(normalCallback).toHaveBeenCalledWith(newUser);
        });

        test('should warn on unknown state key subscription', () => {
            const callback = jest.fn();
            stateManager.subscribe('invalidKey', callback);

            expect(global.logger.warn).toHaveBeenCalled();
        });
    });

    // ============================================
    // USER STATE TESTS
    // ============================================
    describe('User State Management', () => {
        test('should set current user', () => {
            const user = {
                id: 1,
                username: 'testuser',
                is_admin: false,
                calorie_goal: 2500
            };

            stateManager.setCurrentUser(user);

            expect(stateManager.currentUser).toEqual(user);
            expect(stateManager.isAdmin).toBe(false);
            expect(stateManager.calorieGoal).toBe(2500);
        });

        test('should set admin user correctly', () => {
            const adminUser = {
                id: 2,
                username: 'admin',
                is_admin: true,
                calorie_goal: 2000
            };

            stateManager.setCurrentUser(adminUser);

            expect(stateManager.isAdmin).toBe(true);
        });

        test('should notify subscribers when user is set', () => {
            const callback = jest.fn();
            stateManager.subscribe('user', callback);

            const user = { id: 1, username: 'testuser' };
            stateManager.setCurrentUser(user);

            expect(callback).toHaveBeenCalledWith(user);
        });

        test('should get current user', () => {
            const user = { id: 1, username: 'testuser' };
            stateManager.currentUser = user;

            expect(stateManager.getCurrentUser()).toEqual(user);
        });

        test('should clear user on logout', () => {
            const user = { id: 1, username: 'testuser', is_admin: true };
            stateManager.setCurrentUser(user);

            stateManager.clearUser();

            expect(stateManager.currentUser).toBeNull();
            expect(stateManager.isAdmin).toBe(false);
            expect(stateManager.calorieGoal).toBe(2000); // Default
        });

        test('should update calorie goal', () => {
            const user = { id: 1, username: 'testuser', calorie_goal: 2000 };
            stateManager.setCurrentUser(user);

            stateManager.setCalorieGoal(2500);

            expect(stateManager.calorieGoal).toBe(2500);
            expect(stateManager.currentUser.calorie_goal).toBe(2500);
        });
    });

    // ============================================
    // FOOD LOG STATE TESTS
    // ============================================
    describe('Food Log State Management', () => {
        test('should set food log', () => {
            const foodLog = [
                { id: 1, name: 'Apple', calories: 95 },
                { id: 2, name: 'Banana', calories: 105 }
            ];

            stateManager.setFoodLog(foodLog);

            expect(stateManager.foodLog).toEqual(foodLog);
            expect(stateManager.dailyCalories).toBe(200);
        });

        test('should notify subscribers when food log is set', () => {
            const callback = jest.fn();
            stateManager.subscribe('foodLog', callback);

            const foodLog = [{ id: 1, name: 'Apple', calories: 95 }];
            stateManager.setFoodLog(foodLog);

            expect(callback).toHaveBeenCalledWith(foodLog);
        });

        test('should add food to log', () => {
            const food = { id: 1, name: 'Apple', calories: 95 };

            stateManager.addFoodToLog(food);

            expect(stateManager.foodLog).toHaveLength(1);
            expect(stateManager.foodLog[0]).toEqual(food);
            expect(stateManager.dailyCalories).toBe(95);
        });

        test('should add food to beginning of log', () => {
            stateManager.setFoodLog([{ id: 1, name: 'Apple', calories: 95 }]);
            const newFood = { id: 2, name: 'Banana', calories: 105 };

            stateManager.addFoodToLog(newFood);

            expect(stateManager.foodLog[0]).toEqual(newFood);
            expect(stateManager.foodLog[1].name).toBe('Apple');
        });

        test('should remove food from log', () => {
            const foodLog = [
                { id: 1, name: 'Apple', calories: 95 },
                { id: 2, name: 'Banana', calories: 105 }
            ];
            stateManager.setFoodLog(foodLog);

            const removed = stateManager.removeFoodFromLog(1);

            expect(removed).toBe(true);
            expect(stateManager.foodLog).toHaveLength(1);
            expect(stateManager.foodLog[0].id).toBe(2);
            expect(stateManager.dailyCalories).toBe(105);
        });

        test('should return false when removing non-existent food', () => {
            const removed = stateManager.removeFoodFromLog(999);

            expect(removed).toBe(false);
        });

        test('should clear food log', () => {
            stateManager.setFoodLog([
                { id: 1, name: 'Apple', calories: 95 },
                { id: 2, name: 'Banana', calories: 105 }
            ]);

            stateManager.clearFoodLog();

            expect(stateManager.foodLog).toEqual([]);
            expect(stateManager.dailyCalories).toBe(0);
        });

        test('should update daily calories correctly', () => {
            const foodLog = [
                { id: 1, name: 'Apple', calories: 95 },
                { id: 2, name: 'Banana', calories: 105 },
                { id: 3, name: 'Orange', calories: 62 }
            ];

            stateManager.setFoodLog(foodLog);

            expect(stateManager.dailyCalories).toBe(262);
        });

        test('should handle foods without calories property', () => {
            const foodLog = [
                { id: 1, name: 'Apple' },
                { id: 2, name: 'Banana', calories: 105 }
            ];

            stateManager.setFoodLog(foodLog);

            expect(stateManager.dailyCalories).toBe(105);
        });

        test('should notify dailyCalories subscribers', () => {
            const callback = jest.fn();
            stateManager.subscribe('dailyCalories', callback);

            stateManager.addFoodToLog({ id: 1, name: 'Apple', calories: 95 });

            expect(callback).toHaveBeenCalledWith(95);
        });
    });

    // ============================================
    // ADMIN STATE TESTS
    // ============================================
    describe('Admin State Management', () => {
        test('should set admin users', () => {
            const users = [
                { id: 1, username: 'user1' },
                { id: 2, username: 'user2' }
            ];

            stateManager.setAdminUsers(users);

            expect(stateManager.adminData.users).toEqual(users);
        });

        test('should set admin foods', () => {
            const foods = [
                { id: 1, name: 'Apple', calories: 95 },
                { id: 2, name: 'Banana', calories: 105 }
            ];

            stateManager.setAdminFoods(foods);

            expect(stateManager.adminData.foods).toEqual(foods);
        });

        test('should set admin stats', () => {
            const stats = {
                totalUsers: 100,
                totalFoods: 500,
                totalLogs: 1000
            };

            stateManager.setAdminStats(stats);

            expect(stateManager.adminData.stats).toEqual(stats);
        });

        test('should toggle food sort direction', () => {
            stateManager.setFoodSort('name');
            expect(stateManager.adminData.foodsSortColumn).toBe('name');
            expect(stateManager.adminData.foodsSortDirection).toBe('asc');

            stateManager.setFoodSort('name');
            expect(stateManager.adminData.foodsSortDirection).toBe('desc');

            stateManager.setFoodSort('name');
            expect(stateManager.adminData.foodsSortDirection).toBe('asc');
        });

        test('should change sort column', () => {
            stateManager.setFoodSort('name');
            stateManager.setFoodSort('calories');

            expect(stateManager.adminData.foodsSortColumn).toBe('calories');
            expect(stateManager.adminData.foodsSortDirection).toBe('asc');
        });

        test('should toggle food selection', () => {
            stateManager.toggleFoodSelection(1);
            expect(stateManager.adminData.selectedFoodIds.has(1)).toBe(true);

            stateManager.toggleFoodSelection(1);
            expect(stateManager.adminData.selectedFoodIds.has(1)).toBe(false);
        });

        test('should select all foods', () => {
            const foods = [
                { id: 1, name: 'Apple' },
                { id: 2, name: 'Banana' },
                { id: 3, name: 'Orange' }
            ];
            stateManager.setAdminFoods(foods);

            stateManager.selectAllFoods();

            expect(stateManager.adminData.selectedFoodIds.size).toBe(3);
            expect(stateManager.adminData.selectedFoodIds.has(1)).toBe(true);
            expect(stateManager.adminData.selectedFoodIds.has(2)).toBe(true);
            expect(stateManager.adminData.selectedFoodIds.has(3)).toBe(true);
        });

        test('should deselect all foods', () => {
            stateManager.toggleFoodSelection(1);
            stateManager.toggleFoodSelection(2);

            stateManager.deselectAllFoods();

            expect(stateManager.adminData.selectedFoodIds.size).toBe(0);
        });

        test('should get selected food IDs', () => {
            stateManager.toggleFoodSelection(1);
            stateManager.toggleFoodSelection(2);

            const selected = stateManager.getSelectedFoodIds();

            expect(selected).toBeInstanceOf(Set);
            expect(selected.size).toBe(2);
        });
    });

    // ============================================
    // CACHE TESTS
    // ============================================
    describe('Cache Management', () => {
        test('should add to OpenFoodFacts cache', () => {
            const results = [{ name: 'Apple', calories: 95 }];

            stateManager.addToOpenFoodFactsCache('apple', results);

            expect(stateManager.getFromOpenFoodFactsCache('apple')).toEqual(results);
        });

        test('should add to enhanced search cache', () => {
            const results = [{ name: 'Banana', calories: 105 }];

            stateManager.addToEnhancedSearchCache('banana', results);

            const cached = stateManager.getFromEnhancedSearchCache('banana');
            expect(cached).toEqual(results);
        });

        test('should expire enhanced search cache after timeout', () => {
            const results = [{ name: 'Orange', calories: 62 }];
            stateManager.addToEnhancedSearchCache('orange', results);

            // Mock expired cache
            const cacheEntry = stateManager.enhancedSearchCache.get('orange');
            cacheEntry.timestamp = Date.now() - (CONFIG.LIMITS.CACHE_EXPIRY + 1000);

            const cached = stateManager.getFromEnhancedSearchCache('orange');
            expect(cached).toBeNull();
        });

        test('should clear all caches', () => {
            stateManager.addToOpenFoodFactsCache('apple', []);
            stateManager.addToEnhancedSearchCache('banana', []);

            stateManager.clearAllCaches();

            expect(stateManager.openFoodFactsCache.size).toBe(0);
            expect(stateManager.enhancedSearchCache.size).toBe(0);
        });
    });

    // ============================================
    // PERSISTENCE TESTS
    // ============================================
    describe('State Persistence', () => {
        test('should save state to localStorage', () => {
            const user = { id: 1, username: 'testuser' };
            const foodLog = [{ id: 1, name: 'Apple', calories: 95 }];

            stateManager.setCurrentUser(user);
            stateManager.setFoodLog(foodLog);
            stateManager.saveState();

            const saved = JSON.parse(localStorage.getItem('appState'));
            expect(saved.currentUser).toEqual(user);
            expect(saved.foodLog).toEqual(foodLog);
            expect(saved.calorieGoal).toBe(2000);
        });

        test('should load state from localStorage', () => {
            const state = {
                currentUser: { id: 1, username: 'testuser' },
                foodLog: [{ id: 1, name: 'Apple', calories: 95 }],
                calorieGoal: 2500,
                syncQueue: [],
                lastSyncTime: Date.now()
            };

            localStorage.setItem('appState', JSON.stringify(state));

            const loaded = stateManager.loadState();

            expect(loaded).toBe(true);
            expect(stateManager.currentUser).toEqual(state.currentUser);
            expect(stateManager.foodLog).toEqual(state.foodLog);
            expect(stateManager.calorieGoal).toBe(2500);
            expect(stateManager.dailyCalories).toBe(95);
        });

        test('should return false when loading fails', () => {
            const loaded = stateManager.loadState();
            expect(loaded).toBe(false);
        });

        test('should clear saved state', () => {
            stateManager.saveState();
            stateManager.clearState();

            expect(localStorage.getItem('appState')).toBeNull();
        });

        test('should handle corrupted localStorage data', () => {
            localStorage.setItem('appState', 'invalid json');

            const loaded = stateManager.loadState();

            expect(loaded).toBe(false);
        });
    });

    // ============================================
    // NETWORK STATE TESTS
    // ============================================
    describe('Network State Management', () => {
        test('should set online status', () => {
            stateManager.setOnlineStatus(false);
            expect(stateManager.isOnline).toBe(false);

            stateManager.setOnlineStatus(true);
            expect(stateManager.isOnline).toBe(true);
        });

        test('should notify network subscribers', () => {
            const callback = jest.fn();
            stateManager.subscribe('network', callback);

            stateManager.setOnlineStatus(false);

            expect(callback).toHaveBeenCalledWith(false);
        });

        test('should get online status', () => {
            stateManager.isOnline = false;
            expect(stateManager.getOnlineStatus()).toBe(false);
        });
    });

    // ============================================
    // SYNC STATE TESTS
    // ============================================
    describe('Sync State Management', () => {
        test('should add operation to sync queue', () => {
            const operation = { type: 'add', data: { id: 1 } };

            stateManager.addToSyncQueue(operation);

            expect(stateManager.syncQueue).toHaveLength(1);
            expect(stateManager.syncQueue[0]).toEqual(operation);
        });

        test('should clear sync queue', () => {
            stateManager.addToSyncQueue({ type: 'add' });
            stateManager.addToSyncQueue({ type: 'delete' });

            stateManager.clearSyncQueue();

            expect(stateManager.syncQueue).toHaveLength(0);
        });

        test('should set sync status', () => {
            stateManager.setSyncStatus('syncing');
            expect(stateManager.syncStatus).toBe('syncing');

            stateManager.setSyncStatus('synced');
            expect(stateManager.syncStatus).toBe('synced');
            expect(stateManager.lastSyncTime).toBeTruthy();
        });

        test('should set sync in progress flag', () => {
            stateManager.setSyncInProgress(true);
            expect(stateManager.syncInProgress).toBe(true);

            stateManager.setSyncInProgress(false);
            expect(stateManager.syncInProgress).toBe(false);
        });
    });
});
