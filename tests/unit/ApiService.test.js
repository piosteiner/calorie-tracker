/**
 * ApiService Unit Tests
 * Tests for API communication, error handling, and token management
 */

import { ApiService } from '../../modules/api/ApiService.js';

// Mock dependencies
jest.mock('../../logger.js', () => require('../mocks/logger.js'));
jest.mock('../../config.js', () => require('../mocks/config.js'));

describe('ApiService', () => {
    let apiService;

    beforeEach(() => {
        apiService = new ApiService();
        localStorage.clear();
        global.fetch.mockReset();
    });

    // ============================================
    // INITIALIZATION TESTS
    // ============================================
    describe('Initialization', () => {
        test('should initialize with null token', () => {
            expect(apiService.authToken).toBeNull();
            expect(apiService.isOnline).toBe(false);
        });
    });

    // ============================================
    // TOKEN MANAGEMENT TESTS
    // ============================================
    describe('Token Management', () => {
        test('should set auth token', () => {
            const token = 'test-token-123';

            apiService.setAuthToken(token);

            expect(apiService.authToken).toBe(token);
            expect(localStorage.getItem('authToken')).toBe(token);
        });

        test('should remove auth token', () => {
            apiService.setAuthToken('test-token');

            apiService.setAuthToken(null);

            expect(apiService.authToken).toBeNull();
            expect(localStorage.getItem('authToken')).toBeNull();
        });

        test('should get auth token from memory', () => {
            apiService.authToken = 'memory-token';

            const token = apiService.getAuthToken();

            expect(token).toBe('memory-token');
        });

        test('should get auth token from localStorage if not in memory', () => {
            localStorage.setItem('authToken', 'stored-token');

            const token = apiService.getAuthToken();

            expect(token).toBe('stored-token');
            expect(apiService.authToken).toBe('stored-token');
        });
    });

    // ============================================
    // ONLINE STATUS TESTS
    // ============================================
    describe('Online Status', () => {
        test('should set online status', () => {
            apiService.setOnlineStatus(true);
            expect(apiService.isOnline).toBe(true);

            apiService.setOnlineStatus(false);
            expect(apiService.isOnline).toBe(false);
        });
    });

    // ============================================
    // API CALL TESTS
    // ============================================
    describe('API Call', () => {
        test('should throw error in development mode', async () => {
            global.CONFIG.DEVELOPMENT_MODE = true;

            await expect(apiService.apiCall('/test')).rejects.toThrow('API not available');
        });

        test('should throw error when offline', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(false);

            await expect(apiService.apiCall('/test')).rejects.toThrow('API not available');
        });

        test('should make GET request successfully', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, data: 'test' })
            });

            const result = await apiService.apiCall('/test');

            expect(result).toEqual({ success: true, data: 'test' });
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/test',
                expect.objectContaining({ method: 'GET' })
            );
        });

        test('should include auth token in request headers', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
            apiService.setAuthToken('test-token');

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            await apiService.apiCall('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token'
                    })
                })
            );
        });

        test('should make POST request with data', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            const data = { username: 'test', password: 'pass' };
            await apiService.apiCall('/login', 'POST', data);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(data)
                })
            );
        });

        test('should handle HTTP error responses', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);

            global.fetch.mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ error: 'Not found' })
            });

            await expect(apiService.apiCall('/test')).rejects.toThrow('Not found');
        });

        test('should handle network errors', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);

            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => { throw new Error('Parse error'); }
            });

            await expect(apiService.apiCall('/test')).rejects.toThrow('Network error');
        });

        test('should handle backend response with success=false', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: false, message: 'Operation failed' })
            });

            await expect(apiService.apiCall('/test')).rejects.toThrow('Operation failed');
        });

        test('should not log 401 errors for auth verify endpoint', async () => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);

            global.fetch.mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' })
            });

            await expect(apiService.apiCall('/auth/verify')).rejects.toThrow();

            // Logger.error should not be called for this specific case
            const errorCalls = global.logger.error.mock.calls;
            expect(errorCalls.every(call => !call[0].includes('401'))).toBe(true);
        });
    });

    // ============================================
    // AUTHENTICATION ENDPOINTS TESTS
    // ============================================
    describe('Authentication Endpoints', () => {
        beforeEach(() => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
        });

        test('should verify authentication', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, user: { id: 1 } })
            });

            const result = await apiService.verifyAuth();

            expect(result.user).toBeDefined();
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/auth/verify',
                expect.objectContaining({ method: 'GET' })
            );
        });

        test('should login user', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    token: 'new-token',
                    user: { id: 1, username: 'testuser' }
                })
            });

            const result = await apiService.login('testuser', 'password');

            expect(result.token).toBe('new-token');
            expect(result.user.username).toBe('testuser');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/auth/login',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ username: 'testuser', password: 'password' })
                })
            );
        });

        test('should logout user', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            await apiService.logout();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/auth/logout',
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    // ============================================
    // FOOD ENDPOINTS TESTS
    // ============================================
    describe('Food Endpoints', () => {
        beforeEach(() => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
        });

        test('should search foods', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    foods: [{ id: 1, name: 'Apple' }]
                })
            });

            const result = await apiService.searchFoods('apple');

            expect(result.foods).toHaveLength(1);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/foods/search?q=apple',
                expect.any(Object)
            );
        });

        test('should encode search query', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true, foods: [] })
            });

            await apiService.searchFoods('apple pie & cream');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('apple%20pie%20%26%20cream'),
                expect.any(Object)
            );
        });
    });

    // ============================================
    // LOG ENDPOINTS TESTS
    // ============================================
    describe('Log Endpoints', () => {
        beforeEach(() => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
        });

        test('should get logs for date', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    logs: [{ id: 1, name: 'Apple' }]
                })
            });

            const result = await apiService.getLogs('2025-10-06');

            expect(result.logs).toBeDefined();
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/logs?date=2025-10-06',
                expect.any(Object)
            );
        });

        test('should create log entry', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    log: { id: 1, name: 'Apple', calories: 95 }
                })
            });

            const logData = { name: 'Apple', calories: 95, quantity: 100 };
            const result = await apiService.createLog(logData);

            expect(result.log.id).toBe(1);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/logs',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(logData)
                })
            );
        });

        test('should delete log entry', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            await apiService.deleteLog(123);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/logs/123',
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    // ============================================
    // USER ENDPOINTS TESTS
    // ============================================
    describe('User Endpoints', () => {
        beforeEach(() => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
        });

        test('should update calorie goal', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            await apiService.updateGoal(2500);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/user/goal',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({ goal: 2500 })
                })
            );
        });
    });

    // ============================================
    // ADMIN ENDPOINTS TESTS
    // ============================================
    describe('Admin Endpoints', () => {
        beforeEach(() => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
        });

        test('should get admin stats', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    stats: { totalUsers: 100 }
                })
            });

            const result = await apiService.getAdminStats();

            expect(result.stats).toBeDefined();
        });

        test('should get admin users', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    users: [{ id: 1, username: 'user1' }]
                })
            });

            const result = await apiService.getAdminUsers();

            expect(result.users).toHaveLength(1);
        });

        test('should get admin foods', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    foods: [{ id: 1, name: 'Apple' }]
                })
            });

            const result = await apiService.getAdminFoods();

            expect(result.foods).toHaveLength(1);
        });

        test('should create food', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    food: { id: 1, name: 'New Food' }
                })
            });

            const foodData = { name: 'New Food', calories: 100 };
            const result = await apiService.createFood(foodData);

            expect(result.food.id).toBe(1);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/admin/foods',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(foodData)
                })
            );
        });

        test('should delete food', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            await apiService.deleteFood(123);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/admin/foods/123',
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        test('should reset user password', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    newPassword: 'temp123'
                })
            });

            const result = await apiService.resetUserPassword(456);

            expect(result.newPassword).toBe('temp123');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/admin/users/456/reset-password',
                expect.objectContaining({ method: 'POST' })
            );
        });

        test('should delete user', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ success: true })
            });

            await apiService.deleteUser(456);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/admin/users/456',
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        test('should get database tables', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    tables: [{ table_name: 'users' }]
                })
            });

            const result = await apiService.getDatabaseTables();

            expect(result.tables).toHaveLength(1);
        });

        test('should browse table', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    data: { rows: [] }
                })
            });

            const result = await apiService.browseTable('users');

            expect(result.data).toBeDefined();
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/admin/database/browse/users',
                expect.any(Object)
            );
        });

        test('should get table structure', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    columns: []
                })
            });

            const result = await apiService.getTableStructure('users');

            expect(result.columns).toBeDefined();
        });

        test('should execute SQL query', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    results: []
                })
            });

            const result = await apiService.executeSQLQuery('SELECT * FROM users');

            expect(result.results).toBeDefined();
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/admin/database/query',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ query: 'SELECT * FROM users' })
                })
            );
        });
    });

    // ============================================
    // EXTERNAL FOODS ENDPOINTS TESTS
    // ============================================
    describe('External Foods Endpoints', () => {
        beforeEach(() => {
            global.CONFIG.DEVELOPMENT_MODE = false;
            apiService.setOnlineStatus(true);
        });

        test('should log external food', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    log: { id: 1 }
                })
            });

            const foodData = {
                name: 'Apple',
                calories: 95,
                quantity: 100,
                source: 'Open Food Facts'
            };

            const result = await apiService.logExternalFood(foodData);

            expect(result.log.id).toBe(1);
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3000/external-foods/log',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(foodData)
                })
            );
        });
    });
});
