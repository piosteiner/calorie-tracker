/**
 * Logger Utility for Calorie Tracker
 * Environment-aware logging with different levels
 */

class Logger {
    constructor() {
        // Access CONFIG from window if available, otherwise use default
        const CONFIG = typeof window !== 'undefined' && window.CONFIG ? window.CONFIG : { DEVELOPMENT_MODE: false };
        this.isDevelopment = CONFIG.DEVELOPMENT_MODE || false;
        this.levels = {
            ERROR: 'error',
            WARN: 'warn',
            INFO: 'info',
            DEBUG: 'debug'
        };
    }

    /**
     * Log error messages (always shown)
     */
    error(message, ...args) {
        console.error(`[ERROR] ${message}`, ...args);
    }

    /**
     * Log warning messages (always shown)
     */
    warn(message, ...args) {
        console.warn(`[WARN] ${message}`, ...args);
    }

    /**
     * Log info messages (only in development)
     */
    info(message, ...args) {
        if (this.isDevelopment) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    /**
     * Log debug messages (only in development)
     */
    debug(message, ...args) {
        if (this.isDevelopment) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log with emoji prefix for better visibility (dev only)
     */
    emoji(emoji, message, ...args) {
        if (this.isDevelopment) {
            console.log(`${emoji} ${message}`, ...args);
        }
    }

    /**
     * Group related logs together (dev only)
     */
    group(label, callback) {
        if (this.isDevelopment) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Performance timing utility
     */
    time(label) {
        if (this.isDevelopment) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    }

    /**
     * Table display for objects/arrays (dev only)
     */
    table(data) {
        if (this.isDevelopment && data) {
            console.table(data);
        }
    }
}

// Create singleton instance
const logger = new Logger();

// Make available as global variable for non-module scripts
if (typeof window !== 'undefined') {
    window.logger = logger;
}

// Export for ES6 modules
export default logger;
export { logger, Logger };

// CommonJS export (for Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
}
