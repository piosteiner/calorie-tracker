/**
 * Logger Utility for Calorie Tracker
 * Environment-aware logging with different levels
 */

class Logger {
    constructor() {
        // Access CONFIG from window if available, otherwise default to debug on
        const CONFIG = typeof window !== 'undefined' && window.CONFIG ? window.CONFIG : {};
        this.enableDebug = CONFIG.ENABLE_DEBUG_LOGGING !== undefined ? CONFIG.ENABLE_DEBUG_LOGGING : true;
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
     * Log info messages (controlled by ENABLE_DEBUG_LOGGING)
     */
    info(message, ...args) {
        if (this.enableDebug) {
            console.log(`[INFO] ${message}`, ...args);
        }
    }

    /**
     * Log debug messages (controlled by ENABLE_DEBUG_LOGGING)
     */
    debug(message, ...args) {
        if (this.enableDebug) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Log with emoji prefix for better visibility (controlled by ENABLE_DEBUG_LOGGING)
     */
    emoji(emoji, message, ...args) {
        if (this.enableDebug) {
            console.log(`${emoji} ${message}`, ...args);
        }
    }

    /**
     * Group related logs together (controlled by ENABLE_DEBUG_LOGGING)
     */
    group(label, callback) {
        if (this.enableDebug) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Performance timing utility
     */
    time(label) {
        if (this.enableDebug) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.enableDebug) {
            console.timeEnd(label);
        }
    }

    /**
     * Table display for objects/arrays (controlled by ENABLE_DEBUG_LOGGING)
     */
    table(data) {
        if (this.enableDebug && data) {
            console.table(data);
        }
    }
}

// Create singleton instance
const logger = new Logger();

// Make available as global variable
if (typeof window !== 'undefined') {
    window.logger = logger;
}

// CommonJS export (for Node.js compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = logger;
}

// Note: To use as ES6 module, load this file with type="module" and uncomment below:
// export default logger;
// export { logger, Logger };
