const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Validate environment variables on startup
const { validateEnv, getConfig } = require('./config/env');
validateEnv();
const config = getConfig();

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/foods');
const logRoutes = require('./routes/logs');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const adminFoodsRoutes = require('./routes/adminFoods');
const adminDatabaseRoutes = require('./routes/adminDatabase');
const userFoodsRoutes = require('./routes/userFoods');
const weightRoutes = require('./routes/weight');
const db = require('./database');

const app = express();
const PORT = config.port;

// Trust proxy (we're behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.frontend.url,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    trustProxy: true
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    trustProxy: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        await db.query('SELECT 1');
        
        res.json({ 
            status: 'OK',
            database: 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: config.nodeEnv,
            version: require('./package.json').version
        });
    } catch (error) {
        res.status(503).json({
            status: 'UNHEALTHY',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            error: config.nodeEnv === 'development' ? error.message : 'Database connection error'
        });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/user', userRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/foods', adminFoodsRoutes);
app.use('/api/admin/database', adminDatabaseRoutes);
app.use('/api/admin/user-foods', userFoodsRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.type === 'validation') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.details
        });
    }
    
    if (err.type === 'authentication') {
        return res.status(401).json({
            error: 'Authentication required'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server with database connection check
async function startServer() {
    try {
        // Test database connection before starting server
        await db.query('SELECT 1');
        console.log('✅ Database connection successful');
        
        const server = app.listen(PORT, () => {
            console.log(`🚀 Calorie Tracker API running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🌐 Frontend URL: ${config.frontend.url}`);
            console.log(`🔒 Environment: ${config.nodeEnv}`);
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal) => {
            console.log(`\n${signal} received, closing server gracefully...`);
            
            server.close(async () => {
                console.log('HTTP server closed');
                
                try {
                    await db.close();
                    console.log('Database connections closed');
                    console.log('Server shut down successfully');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };

        // Listen for shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Server cannot start without database connection');
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;