
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/foods');
const logRoutes = require('./routes/logs');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const externalFoodsRoutes = require('./routes/external-foods');
const adminFoodsRoutes = require('./routes/adminFoods');

// Start cache cleanup job
const cacheCleanupJob = require('./jobs/cacheCleanup');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (we're behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://calorie-tracker.piogino.ch',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    trustProxy: true // Trust the proxy for X-Forwarded-For headers
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/external-foods', externalFoodsRoutes);

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
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Calorie Tracker API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    
    // Start cache cleanup job
    cacheCleanupJob.start();
});

module.exports = app;