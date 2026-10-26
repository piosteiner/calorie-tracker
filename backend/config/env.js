/**
 * Environment Variables Validation
 * Validates required environment variables on application startup
 */

const requiredEnvVars = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'FRONTEND_URL'
];

const optionalEnvVars = [
    'PORT',
    'NODE_ENV',
    'DB_PORT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
    'LOG_LEVEL',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_SUBJECT'
];

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required variable is missing
 */
function validateEnv() {
    const missing = [];
    const warnings = [];

    // Check required variables
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    });

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables:\n` +
            missing.map(v => `  - ${v}`).join('\n') +
            `\n\nPlease set these variables in your .env file or environment.`
        );
    }

    // Check for insecure default values
    if (process.env.JWT_SECRET === 'your_very_secure_jwt_secret_key_change_this_in_production') {
        warnings.push('JWT_SECRET is set to default value. Please change it in production!');
    }

    if (process.env.NODE_ENV === 'production') {
        // Additional production checks
        if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
            warnings.push('JWT_SECRET should be at least 32 characters long in production.');
        }
    }

    // Log warnings
    if (warnings.length > 0) {
        console.warn('\n⚠️  Environment Configuration Warnings:');
        warnings.forEach(warning => console.warn(`  - ${warning}`));
        console.warn('');
    }

    console.log('✅ Environment variables validated successfully\n');
}

/**
 * Gets environment configuration with defaults
 * @returns {object} Configuration object
 */
function getConfig() {
    return {
        port: parseInt(process.env.PORT, 10) || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
        database: {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10) || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            name: process.env.DB_NAME,
            connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10
        },
        jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        },
        frontend: {
            url: process.env.FRONTEND_URL
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
        },
        logging: {
            level: process.env.LOG_LEVEL || 'info'
        },
        vapid: {
            publicKey:  process.env.VAPID_PUBLIC_KEY  || null,
            privateKey: process.env.VAPID_PRIVATE_KEY || null,
            subject:    process.env.VAPID_SUBJECT     || null
        }
    };
}

module.exports = {
    validateEnv,
    getConfig
};
