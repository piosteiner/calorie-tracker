/**
 * ApiService.js
 * Centralized API service for all backend communication
 * Handles authentication, error handling, and request formatting
 */

import { logger } from '../../logger.js';
import { CONFIG } from '../../config.js';

export class ApiService {
    constructor() {
        this.authToken = null;
        this.isOnline = false;
    }

    /**
     * Set authentication token
     * @param {string} token - JWT token
     */
    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    /**
     * Get authentication token from memory or localStorage
     * @returns {string|null}
     */
    getAuthToken() {
        if (!this.authToken) {
            this.authToken = localStorage.getItem('authToken');
        }
        return this.authToken;
    }

    /**
     * Set online/offline status
     * @param {boolean} status
     */
    setOnlineStatus(status) {
        this.isOnline = status;
    }

    /**
     * Base API call method
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request body data
     * @returns {Promise<Object>} API response
     */
    async apiCall(endpoint, method = 'GET', data = null) {
        if (CONFIG.DEVELOPMENT_MODE || !this.isOnline) {
            throw new Error('API not available in development/offline mode');
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.authToken) {
            options.headers.Authorization = `Bearer ${this.authToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Network error' }));
            
            // Don't log auth errors as they're expected when not logged in
            if (response.status !== 401 || endpoint !== '/auth/verify') {
                logger.error(`API Error (${response.status}):`, errorData.error || errorData.message);
            }
            
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        // Handle new backend response format
        if (result.success === false) {
            throw new Error(result.message || result.error || 'API request failed');
        }
        
        return result;
    }

    // ============================================
    // AUTHENTICATION ENDPOINTS
    // ============================================

    /**
     * Verify authentication token
     * @returns {Promise<Object>} User data
     */
    async verifyAuth() {
        return await this.apiCall('/auth/verify', 'GET');
    }

    /**
     * Login user
     * @param {string} username
     * @param {string} password
     * @returns {Promise<Object>} Login response with token and user data
     */
    async login(username, password) {
        return await this.apiCall('/auth/login', 'POST', { username, password });
    }

    /**
     * Logout user
     * @returns {Promise<void>}
     */
    async logout() {
        await this.apiCall('/auth/logout', 'POST');
    }

    // ============================================
    // FOOD ENDPOINTS
    // ============================================

    /**
     * Search foods
     * @param {string} query - Search query
     * @returns {Promise<Object>} Search results
     */
    async searchFoods(query) {
        return await this.apiCall(`/foods/search?q=${encodeURIComponent(query)}`);
    }

    // ============================================
    // LOG ENDPOINTS
    // ============================================

    /**
     * Get logs for a specific date
     * @param {string} date - Date string (YYYY-MM-DD)
     * @returns {Promise<Object>} Logs data
     */
    async getLogs(date) {
        return await this.apiCall(`/logs?date=${date}`);
    }

    /**
     * Create a new food log entry
     * @param {Object} logData - Log entry data
     * @returns {Promise<Object>} Created log entry
     */
    async createLog(logData) {
        return await this.apiCall('/logs', 'POST', logData);
    }

    /**
     * Delete a log entry
     * @param {number} logId - Log entry ID
     * @returns {Promise<void>}
     */
    async deleteLog(logId) {
        return await this.apiCall(`/logs/${logId}`, 'DELETE');
    }

    // ============================================
    // EXTERNAL FOODS ENDPOINTS
    // ============================================

    /**
     * Log external food (from API search)
     * @param {Object} foodData - External food data
     * @returns {Promise<Object>} Created log entry
     */
    async logExternalFood(foodData) {
        return await this.apiCall('/external-foods/log', 'POST', foodData);
    }

    // ============================================
    // USER ENDPOINTS
    // ============================================

    /**
     * Update user's daily calorie goal
     * @param {number} goal - New calorie goal
     * @returns {Promise<Object>} Update confirmation
     */
    async updateGoal(goal) {
        return await this.apiCall('/user/goal', 'PUT', { goal });
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    /**
     * Get admin statistics
     * @returns {Promise<Object>} Statistics data
     */
    async getAdminStats() {
        return await this.apiCall('/admin/stats');
    }

    /**
     * Get all users (admin only)
     * @returns {Promise<Object>} Users list
     */
    async getAdminUsers() {
        return await this.apiCall('/admin/users');
    }

    /**
     * Get all foods (admin only)
     * @returns {Promise<Object>} Foods list
     */
    async getAdminFoods() {
        return await this.apiCall('/admin/foods');
    }

    /**
     * Create a new food (admin only)
     * @param {Object} foodData - Food data
     * @returns {Promise<Object>} Created food
     */
    async createFood(foodData) {
        return await this.apiCall('/admin/foods', 'POST', foodData);
    }

    /**
     * Delete a food (admin only)
     * @param {number} foodId - Food ID
     * @returns {Promise<void>}
     */
    async deleteFood(foodId) {
        return await this.apiCall(`/admin/foods/${foodId}`, 'DELETE');
    }

    /**
     * Reset user password (admin only)
     * @param {number} userId - User ID
     * @returns {Promise<Object>} New password
     */
    async resetUserPassword(userId) {
        return await this.apiCall(`/admin/users/${userId}/reset-password`, 'POST');
    }

    /**
     * Delete user (admin only)
     * @param {number} userId - User ID
     * @returns {Promise<void>}
     */
    async deleteUser(userId) {
        return await this.apiCall(`/admin/users/${userId}`, 'DELETE');
    }

    /**
     * Get database tables (admin only)
     * @returns {Promise<Object>} Tables list
     */
    async getDatabaseTables() {
        return await this.apiCall('/admin/database/tables');
    }

    /**
     * Browse table data (admin only)
     * @param {string} tableName - Table name
     * @returns {Promise<Object>} Table data
     */
    async browseTable(tableName) {
        return await this.apiCall(`/admin/database/browse/${tableName}`);
    }

    /**
     * Get table structure (admin only)
     * @param {string} tableName - Table name
     * @returns {Promise<Object>} Table structure
     */
    async getTableStructure(tableName) {
        return await this.apiCall(`/admin/database/structure/${tableName}`);
    }

    /**
     * Execute SQL query (admin only)
     * @param {string} query - SQL query
     * @returns {Promise<Object>} Query results
     */
    async executeSQLQuery(query) {
        return await this.apiCall('/admin/database/query', 'POST', { query });
    }
}

// Export singleton instance
export const apiService = new ApiService();
