/**
 * Input Validation Utilities for Calorie Tracker
 * Provides comprehensive validation and sanitization for user inputs
 */

const Validators = {
    /**
     * Sanitize string input to prevent XSS attacks
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Validate and sanitize food name
     * @param {string} name - Food name to validate
     * @returns {string} Validated and sanitized food name
     * @throws {Error} If validation fails
     */
    validateFoodName(name) {
        const sanitized = this.sanitizeString(name.trim());
        
        if (sanitized.length < 1) {
            throw new Error('Food name is required');
        }
        
        if (sanitized.length > 100) {
            throw new Error('Food name too long (max 100 characters)');
        }
        
        return sanitized;
    },

    /**
     * Validate calorie value
     * @param {number|string} value - Calorie value to validate
     * @returns {number} Validated calorie value
     * @throws {Error} If validation fails
     */
    validateCalories(value) {
        const calories = parseFloat(value);
        
        if (isNaN(calories)) {
            throw new Error('Calories must be a valid number');
        }
        
        if (calories < 0) {
            throw new Error('Calories cannot be negative');
        }
        
        if (calories > 10000) {
            throw new Error('Calorie value seems unrealistic (max 10,000 per 100g)');
        }
        
        return Math.round(calories * 100) / 100; // Round to 2 decimal places
    },

    /**
     * Validate quantity value
     * @param {number|string} value - Quantity to validate
     * @returns {number} Validated quantity
     * @throws {Error} If validation fails
     */
    validateQuantity(value) {
        const quantity = parseFloat(value);
        
        if (isNaN(quantity)) {
            throw new Error('Quantity must be a valid number');
        }
        
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }
        
        if (quantity > 10000) {
            throw new Error('Quantity value seems too high (max 10,000g)');
        }
        
        return Math.round(quantity * 100) / 100; // Round to 2 decimal places
    },

    /**
     * Validate username
     * @param {string} username - Username to validate
     * @returns {string} Validated and sanitized username
     * @throws {Error} If validation fails
     */
    validateUsername(username) {
        const sanitized = this.sanitizeString(username.trim());
        
        if (sanitized.length < 3) {
            throw new Error('Username must be at least 3 characters');
        }
        
        if (sanitized.length > 50) {
            throw new Error('Username too long (max 50 characters)');
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
            throw new Error('Username can only contain letters, numbers, hyphens, and underscores');
        }
        
        return sanitized;
    },

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {string} Validated password
     * @throws {Error} If validation fails
     */
    validatePassword(password) {
        if (typeof password !== 'string') {
            throw new Error('Password is required');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
        if (password.length > 128) {
            throw new Error('Password too long (max 128 characters)');
        }
        
        return password; // Don't sanitize passwords
    },

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {string} Validated and sanitized email
     * @throws {Error} If validation fails
     */
    validateEmail(email) {
        const sanitized = this.sanitizeString(email.trim().toLowerCase());
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
            throw new Error('Invalid email address format');
        }
        
        if (sanitized.length > 254) {
            throw new Error('Email address too long');
        }
        
        return sanitized;
    },

    /**
     * Validate positive integer
     * @param {number|string} value - Value to validate
     * @param {string} fieldName - Name of field for error messages
     * @returns {number} Validated integer
     * @throws {Error} If validation fails
     */
    validatePositiveInteger(value, fieldName = 'Value') {
        const num = parseInt(value, 10);
        
        if (isNaN(num)) {
            throw new Error(`${fieldName} must be a valid number`);
        }
        
        if (num <= 0) {
            throw new Error(`${fieldName} must be greater than zero`);
        }
        
        if (num > Number.MAX_SAFE_INTEGER) {
            throw new Error(`${fieldName} is too large`);
        }
        
        return num;
    },

    /**
     * Validate daily calorie goal
     * @param {number|string} goal - Calorie goal to validate
     * @returns {number} Validated calorie goal
     * @throws {Error} If validation fails
     */
    validateCalorieGoal(goal) {
        const calories = parseInt(goal, 10);
        
        if (isNaN(calories)) {
            throw new Error('Calorie goal must be a valid number');
        }
        
        if (calories < 1000) {
            throw new Error('Calorie goal seems too low (minimum 1,000)');
        }
        
        if (calories > 5000) {
            throw new Error('Calorie goal seems too high (maximum 5,000)');
        }
        
        return calories;
    },

    /**
     * Validate search query
     * @param {string} query - Search query to validate
     * @param {number} minLength - Minimum query length
     * @returns {string} Validated and sanitized query
     * @throws {Error} If validation fails
     */
    validateSearchQuery(query, minLength = 2) {
        const sanitized = this.sanitizeString(query.trim());
        
        if (sanitized.length < minLength) {
            throw new Error(`Search query must be at least ${minLength} characters`);
        }
        
        if (sanitized.length > 100) {
            throw new Error('Search query too long (max 100 characters)');
        }
        
        return sanitized;
    },

    /**
     * Validate date string
     * @param {string} dateString - Date string to validate
     * @returns {Date} Validated Date object
     * @throws {Error} If validation fails
     */
    validateDate(dateString) {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format');
        }
        
        // Check if date is not too far in the past or future
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        if (date < oneYearAgo || date > oneYearFromNow) {
            throw new Error('Date must be within one year of today');
        }
        
        return date;
    },

    /**
     * Validate array of IDs
     * @param {Array} ids - Array of IDs to validate
     * @returns {Array<number>} Validated array of integers
     * @throws {Error} If validation fails
     */
    validateIdArray(ids) {
        if (!Array.isArray(ids)) {
            throw new Error('IDs must be provided as an array');
        }
        
        if (ids.length === 0) {
            throw new Error('At least one ID must be provided');
        }
        
        if (ids.length > 100) {
            throw new Error('Too many IDs (max 100)');
        }
        
        const validatedIds = ids.map(id => {
            const num = parseInt(id, 10);
            if (isNaN(num) || num <= 0) {
                throw new Error('All IDs must be valid positive integers');
            }
            return num;
        });
        
        return validatedIds;
    },

    /**
     * Validate SQL query (basic check)
     * @param {string} query - SQL query to validate
     * @returns {string} Validated query
     * @throws {Error} If validation fails or dangerous operations detected
     */
    validateSQLQuery(query) {
        const sanitized = query.trim();
        
        if (sanitized.length === 0) {
            throw new Error('SQL query cannot be empty');
        }
        
        if (sanitized.length > 5000) {
            throw new Error('SQL query too long (max 5000 characters)');
        }
        
        // Block dangerous operations (basic check)
        const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
        const upperQuery = sanitized.toUpperCase();
        
        for (const keyword of dangerousKeywords) {
            if (upperQuery.includes(keyword)) {
                throw new Error(`Dangerous SQL operation "${keyword}" is not allowed`);
            }
        }
        
        return sanitized;
    },

    /**
     * Generic field validator with custom rules
     * @param {any} value - Value to validate
     * @param {Object} rules - Validation rules
     * @returns {any} Validated value
     * @throws {Error} If validation fails
     * 
     * @example
     * Validators.validate('test@example.com', {
     *     required: true,
     *     type: 'email',
     *     maxLength: 100
     * });
     */
    validate(value, rules = {}) {
        // Required check
        if (rules.required && (value === null || value === undefined || value === '')) {
            throw new Error(`${rules.fieldName || 'Field'} is required`);
        }
        
        // Type check
        if (rules.type) {
            switch (rules.type) {
                case 'email':
                    return this.validateEmail(value);
                case 'number':
                    return this.validatePositiveInteger(value, rules.fieldName);
                case 'string':
                    return this.sanitizeString(value);
                default:
                    break;
            }
        }
        
        // Min/Max length for strings
        if (typeof value === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                throw new Error(`${rules.fieldName || 'Field'} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                throw new Error(`${rules.fieldName || 'Field'} must be no more than ${rules.maxLength} characters`);
            }
        }
        
        // Min/Max value for numbers
        if (typeof value === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                throw new Error(`${rules.fieldName || 'Value'} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                throw new Error(`${rules.fieldName || 'Value'} must be no more than ${rules.max}`);
            }
        }
        
        // Pattern matching
        if (rules.pattern && typeof value === 'string') {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
                throw new Error(rules.patternMessage || `${rules.fieldName || 'Field'} format is invalid`);
            }
        }
        
        // Custom validator function
        if (rules.custom && typeof rules.custom === 'function') {
            return rules.custom(value);
        }
        
        return value;
    }
};

// Export for use throughout app
if (typeof window !== 'undefined') {
    window.Validators = Validators;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
}
