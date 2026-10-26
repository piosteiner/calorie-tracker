const jwt = require('jsonwebtoken');
const db = require('../database');

// Ensure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to authenticate requests
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify session is still valid
        const session = await db.getSession(decoded.sessionId);
        if (!session) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }

        // Add user info to request
        req.user = {
            id: session.user_id,
            username: session.username,
            dailyCalorieGoal: session.daily_calorie_goal,
            sessionId: decoded.sessionId
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
};

// Middleware to optionally authenticate (won't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const session = await db.getSession(decoded.sessionId);
            
            if (session) {
                req.user = {
                    id: session.user_id,
                    username: session.username,
                    dailyCalorieGoal: session.daily_calorie_goal,
                    sessionId: decoded.sessionId
                };
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    authenticateToken,
    optionalAuth
};