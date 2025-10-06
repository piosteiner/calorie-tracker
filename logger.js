/**
 * Logger Utility for Calorie Tracker
 * Environment-aware logging with different levels
 */

class Logger {
    constructor() {
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

// Export for use throughout app
if (typeof window !== 'undefined') {
    window.logger = logger;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
}
